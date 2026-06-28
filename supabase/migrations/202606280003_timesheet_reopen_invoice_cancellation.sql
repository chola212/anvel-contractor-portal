-- Repair contractor timesheet updates and make reopening an auditable,
-- transactional operation that cancels superseded invoice records.

drop policy if exists "timesheets_update_own_unapproved"
on public.timesheets;

create policy "timesheets_update_own_unapproved"
on public.timesheets for update to authenticated
using (
  public.owns_contractor(contractor_id)
  and status in ('draft', 'rejected', 'reopened')
)
with check (
  public.owns_contractor(contractor_id)
  and status in ('draft', 'rejected', 'reopened', 'submitted')
);

alter table public.timesheets
  add column if not exists reopened_by uuid,
  add column if not exists reopened_at timestamptz,
  add column if not exists reopen_reason text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'timesheets_reopened_by_fkey'
      and conrelid = 'public.timesheets'::regclass
  ) then
    alter table public.timesheets
      add constraint timesheets_reopened_by_fkey
      foreign key (reopened_by)
      references public.profiles(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'timesheets_reopen_reason_check'
      and conrelid = 'public.timesheets'::regclass
  ) then
    alter table public.timesheets
      add constraint timesheets_reopen_reason_check
      check (
        reopen_reason is null
        or char_length(btrim(reopen_reason)) between 5 and 1000
      );
  end if;
end $$;

create table if not exists public.timesheet_reopen_events (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  reopened_by uuid references public.profiles(id) on delete set null,
  reopened_at timestamptz not null default now(),
  reason text not null
    check (char_length(btrim(reason)) between 5 and 1000),
  previous_status text not null
    check (previous_status in ('approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists timesheet_reopen_events_timesheet_id_idx
  on public.timesheet_reopen_events(timesheet_id, reopened_at desc);

alter table public.timesheet_reopen_events enable row level security;
grant select, insert, update, delete
on public.timesheet_reopen_events
to authenticated;

drop policy if exists "timesheet_reopen_events_admin_all"
on public.timesheet_reopen_events;
create policy "timesheet_reopen_events_admin_all"
on public.timesheet_reopen_events for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "timesheet_reopen_events_contractor_select_own"
on public.timesheet_reopen_events;
create policy "timesheet_reopen_events_contractor_select_own"
on public.timesheet_reopen_events for select to authenticated
using (
  exists (
    select 1
    from public.timesheets t
    where t.id = timesheet_reopen_events.timesheet_id
      and public.owns_contractor(t.contractor_id)
  )
);

alter table public.invoices
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid,
  add column if not exists cancellation_reason text,
  add column if not exists cancellation_email_status text
    not null default 'not_required',
  add column if not exists cancellation_emailed_at timestamptz;

alter table public.outgoing_invoices
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid,
  add column if not exists cancellation_reason text,
  add column if not exists cancellation_email_status text
    not null default 'not_required',
  add column if not exists cancellation_emailed_at timestamptz;

update public.invoices
set cancellation_email_status = 'not_required'
where cancellation_email_status is null;

update public.outgoing_invoices
set cancellation_email_status = 'not_required'
where cancellation_email_status is null;

alter table public.invoices
  alter column cancellation_email_status set default 'not_required',
  alter column cancellation_email_status set not null;

alter table public.outgoing_invoices
  alter column cancellation_email_status set default 'not_required',
  alter column cancellation_email_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoices_cancelled_by_fkey'
      and conrelid = 'public.invoices'::regclass
  ) then
    alter table public.invoices
      add constraint invoices_cancelled_by_fkey
      foreign key (cancelled_by)
      references public.profiles(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'outgoing_invoices_cancelled_by_fkey'
      and conrelid = 'public.outgoing_invoices'::regclass
  ) then
    alter table public.outgoing_invoices
      add constraint outgoing_invoices_cancelled_by_fkey
      foreign key (cancelled_by)
      references public.profiles(id)
      on delete set null;
  end if;
end $$;

alter table public.invoices
  drop constraint if exists invoices_status_check;
alter table public.invoices
  add constraint invoices_status_check
  check (
    status in (
      'pending_upload',
      'uploaded',
      'checked',
      'correction_required',
      'approved_for_payment',
      'paid',
      'on_hold',
      'cancelled'
    )
  );

alter table public.invoices
  drop constraint if exists invoices_cancellation_email_status_check;
alter table public.invoices
  add constraint invoices_cancellation_email_status_check
  check (
    cancellation_email_status in (
      'not_required',
      'sent',
      'failed'
    )
  );

alter table public.outgoing_invoices
  drop constraint if exists outgoing_invoices_cancellation_email_status_check;
alter table public.outgoing_invoices
  add constraint outgoing_invoices_cancellation_email_status_check
  check (
    cancellation_email_status in (
      'not_required',
      'sent',
      'failed'
    )
  );

alter table public.outgoing_invoices
  drop constraint if exists outgoing_invoices_timesheet_id_key;

drop index if exists public.invoices_self_billing_timesheet_unique_idx;
create unique index invoices_self_billing_timesheet_unique_idx
  on public.invoices(timesheet_id)
  where invoice_type = 'self_billing'
    and timesheet_id is not null
    and status <> 'cancelled';

create unique index if not exists outgoing_invoices_active_timesheet_unique_idx
  on public.outgoing_invoices(timesheet_id)
  where status <> 'cancelled';

create or replace function public.reopen_timesheet_with_invoice_cancellation(
  p_timesheet_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_timesheet public.timesheets%rowtype;
  invoice_record record;
  reopened_timestamp timestamptz := now();
  clean_reason text := btrim(p_reason);
  cancellation_message text;
  self_billing_ids jsonb := '[]'::jsonb;
  outgoing_ids jsonb := '[]'::jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if clean_reason is null
    or char_length(clean_reason) < 5
    or char_length(clean_reason) > 1000 then
    raise exception 'Reopen reason must contain between 5 and 1000 characters';
  end if;

  select *
    into target_timesheet
  from public.timesheets
  where id = p_timesheet_id
  for update;

  if not found then
    raise exception 'Timesheet not found';
  end if;

  if target_timesheet.status not in ('approved', 'rejected') then
    raise exception 'Only approved or rejected timesheets can be reopened';
  end if;

  cancellation_message := clean_reason;

  update public.timesheets
  set
    status = 'reopened',
    reopened_by = auth.uid(),
    reopened_at = reopened_timestamp,
    reopen_reason = clean_reason,
    approved_by = null,
    approved_at = null,
    rejected_by = null,
    rejected_at = null,
    rejection_reason = null
  where id = target_timesheet.id;

  insert into public.timesheet_reopen_events (
    timesheet_id,
    reopened_by,
    reopened_at,
    reason,
    previous_status
  )
  values (
    target_timesheet.id,
    auth.uid(),
    reopened_timestamp,
    clean_reason,
    target_timesheet.status
  );

  insert into public.audit_logs (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    auth.uid(),
    'timesheet_reopened',
    'timesheet',
    target_timesheet.id,
    jsonb_build_object(
      'from_status', target_timesheet.status,
      'to_status', 'reopened',
      'reason', clean_reason
    )
  );

  for invoice_record in
    select id, invoice_number, status, email_status
    from public.invoices
    where timesheet_id = target_timesheet.id
      and invoice_type = 'self_billing'
      and status <> 'cancelled'
    for update
  loop
    update public.invoices
    set
      status = 'cancelled',
      cancelled_at = reopened_timestamp,
      cancelled_by = auth.uid(),
      cancellation_reason = cancellation_message,
      cancellation_email_status = 'not_required',
      cancellation_emailed_at = null
    where id = invoice_record.id;

    insert into public.audit_logs (
      actor_profile_id,
      action,
      entity_type,
      entity_id,
      metadata
    )
    values (
      auth.uid(),
      'self_billing_invoice_cancelled_due_to_timesheet_reopen',
      'invoice',
      invoice_record.id,
      jsonb_build_object(
        'timesheet_id', target_timesheet.id,
        'invoice_number', invoice_record.invoice_number,
        'from_status', invoice_record.status,
        'to_status', 'cancelled',
        'reason', cancellation_message
      )
    );

    self_billing_ids := self_billing_ids
      || jsonb_build_array(invoice_record.id::text);
  end loop;

  for invoice_record in
    select id, invoice_number, status, email_status
    from public.outgoing_invoices
    where timesheet_id = target_timesheet.id
      and status <> 'cancelled'
    for update
  loop
    update public.outgoing_invoices
    set
      status = 'cancelled',
      cancelled_at = reopened_timestamp,
      cancelled_by = auth.uid(),
      cancellation_reason = cancellation_message,
      cancellation_email_status = 'not_required',
      cancellation_emailed_at = null
    where id = invoice_record.id;

    insert into public.audit_logs (
      actor_profile_id,
      action,
      entity_type,
      entity_id,
      metadata
    )
    values (
      auth.uid(),
      'outgoing_invoice_cancelled_due_to_timesheet_reopen',
      'outgoing_invoice',
      invoice_record.id,
      jsonb_build_object(
        'timesheet_id', target_timesheet.id,
        'invoice_number', invoice_record.invoice_number,
        'from_status', invoice_record.status,
        'to_status', 'cancelled',
        'reason', cancellation_message
      )
    );

    outgoing_ids := outgoing_ids
      || jsonb_build_array(invoice_record.id::text);
  end loop;

  return jsonb_build_object(
    'reopened_at', reopened_timestamp,
    'self_billing_invoice_ids', self_billing_ids,
    'outgoing_invoice_ids', outgoing_ids
  );
end;
$$;

revoke all
on function public.reopen_timesheet_with_invoice_cancellation(uuid, text)
from public;
grant execute
on function public.reopen_timesheet_with_invoice_cancellation(uuid, text)
to authenticated;

select pg_notify('pgrst', 'reload schema');
