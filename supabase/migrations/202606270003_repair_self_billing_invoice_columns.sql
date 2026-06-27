-- Production-safe repair migration for self-billing invoice metadata.
-- This migration is idempotent and can be run even if 202606270002 was
-- partially applied or skipped in production.

alter table public.invoices
  add column if not exists timesheet_id uuid,
  add column if not exists invoice_type text,
  add column if not exists generated_by uuid,
  add column if not exists generated_at timestamptz,
  add column if not exists emailed_at timestamptz,
  add column if not exists email_status text;

update public.invoices
set invoice_type = 'contractor_uploaded'
where invoice_type is null;

update public.invoices
set email_status = 'not_sent'
where email_status is null;

alter table public.invoices
  alter column invoice_type set default 'contractor_uploaded',
  alter column invoice_type set not null,
  alter column email_status set default 'not_sent',
  alter column email_status set not null;

do $$
declare
  existing_timesheet_fk text;
  existing_generated_by_fk text;
begin
  select conname
    into existing_timesheet_fk
  from pg_constraint
  where conrelid = 'public.invoices'::regclass
    and contype = 'f'
    and array_length(conkey, 1) = 1
    and conkey[1] = (
      select attnum
      from pg_attribute
      where attrelid = 'public.invoices'::regclass
        and attname = 'timesheet_id'
    )
  limit 1;

  if existing_timesheet_fk is not null then
    execute format('alter table public.invoices drop constraint %I', existing_timesheet_fk);
  end if;

  alter table public.invoices
    add constraint invoices_timesheet_id_fkey
    foreign key (timesheet_id)
    references public.timesheets(id)
    on delete set null;

  select conname
    into existing_generated_by_fk
  from pg_constraint
  where conrelid = 'public.invoices'::regclass
    and contype = 'f'
    and array_length(conkey, 1) = 1
    and conkey[1] = (
      select attnum
      from pg_attribute
      where attrelid = 'public.invoices'::regclass
        and attname = 'generated_by'
    )
  limit 1;

  if existing_generated_by_fk is not null then
    execute format('alter table public.invoices drop constraint %I', existing_generated_by_fk);
  end if;

  alter table public.invoices
    add constraint invoices_generated_by_fkey
    foreign key (generated_by)
    references public.profiles(id)
    on delete set null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoices_invoice_type_check'
      and conrelid = 'public.invoices'::regclass
  ) then
    alter table public.invoices
      add constraint invoices_invoice_type_check
      check (invoice_type in ('contractor_uploaded', 'self_billing'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoices_email_status_check'
      and conrelid = 'public.invoices'::regclass
  ) then
    alter table public.invoices
      add constraint invoices_email_status_check
      check (email_status in ('not_sent', 'sent', 'failed'));
  end if;
end $$;

create index if not exists invoices_timesheet_id_idx
  on public.invoices(timesheet_id);

create index if not exists invoices_invoice_type_idx
  on public.invoices(invoice_type);

create unique index if not exists invoices_self_billing_timesheet_unique_idx
  on public.invoices(timesheet_id)
  where invoice_type = 'self_billing' and timesheet_id is not null;

create unique index if not exists invoices_self_billing_invoice_number_unique_idx
  on public.invoices(invoice_number)
  where invoice_type = 'self_billing';

-- Verification query:
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'invoices'
--   and column_name in (
--     'timesheet_id',
--     'invoice_type',
--     'generated_by',
--     'generated_at',
--     'emailed_at',
--     'email_status'
--   )
-- order by column_name;
