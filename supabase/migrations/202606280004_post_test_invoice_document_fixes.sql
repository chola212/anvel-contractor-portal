-- Post-test fixes:
-- - allow audited draft outgoing invoice number edits and replacement drafts;
-- - normalise shared contractor document requirements.

alter table public.outgoing_invoices
  add column if not exists invoice_number_manually_edited boolean not null default false,
  add column if not exists invoice_number_edited_at timestamptz,
  add column if not exists invoice_number_edited_by uuid,
  add column if not exists previous_invoice_number text,
  add column if not exists replaces_invoice_id uuid,
  add column if not exists replaced_by_invoice_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'outgoing_invoices_invoice_number_edited_by_fkey'
      and conrelid = 'public.outgoing_invoices'::regclass
  ) then
    alter table public.outgoing_invoices
      add constraint outgoing_invoices_invoice_number_edited_by_fkey
      foreign key (invoice_number_edited_by)
      references public.profiles(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'outgoing_invoices_replaces_invoice_id_fkey'
      and conrelid = 'public.outgoing_invoices'::regclass
  ) then
    alter table public.outgoing_invoices
      add constraint outgoing_invoices_replaces_invoice_id_fkey
      foreign key (replaces_invoice_id)
      references public.outgoing_invoices(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'outgoing_invoices_replaced_by_invoice_id_fkey'
      and conrelid = 'public.outgoing_invoices'::regclass
  ) then
    alter table public.outgoing_invoices
      add constraint outgoing_invoices_replaced_by_invoice_id_fkey
      foreign key (replaced_by_invoice_id)
      references public.outgoing_invoices(id)
      on delete set null;
  end if;
end $$;

create index if not exists outgoing_invoices_replaces_invoice_id_idx
  on public.outgoing_invoices(replaces_invoice_id);

create index if not exists outgoing_invoices_replaced_by_invoice_id_idx
  on public.outgoing_invoices(replaced_by_invoice_id);

create or replace function public.sync_outgoing_invoice_sequence(
  invoice_year integer,
  used_number integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if invoice_year < 2024 or invoice_year > 2100 then
    raise exception 'Invalid invoice year';
  end if;

  if used_number < 1 then
    raise exception 'Invalid invoice number';
  end if;

  insert into public.outgoing_invoice_sequences (year, last_number)
  values (invoice_year, used_number)
  on conflict (year) do update
    set last_number = greatest(public.outgoing_invoice_sequences.last_number, used_number),
        updated_at = now();
end;
$$;

revoke all
on function public.sync_outgoing_invoice_sequence(integer, integer)
from public;

grant execute
on function public.sync_outgoing_invoice_sequence(integer, integer)
to authenticated;

update public.document_requirements
set name = 'Signed NDA'
where lower(name) = 'nda';

update public.contractor_documents
set document_type = 'signed_nda'
where document_type = 'nda';

delete from public.document_requirements duplicate
using public.document_requirements keeper
where duplicate.id <> keeper.id
  and duplicate.supplier_type is not distinct from keeper.supplier_type
  and lower(duplicate.name) = lower(keeper.name)
  and duplicate.created_at > keeper.created_at;

insert into public.document_requirements (
  supplier_type,
  name,
  is_required,
  requires_expiry_date
)
select null, value.name, value.is_required, false
from (
  values
    ('Contractor Agreement', true),
    ('Signed NDA', false),
    ('Other', false)
) as value(name, is_required)
where not exists (
  select 1
  from public.document_requirements existing
  where existing.supplier_type is null
    and lower(existing.name) = lower(value.name)
);

select pg_notify('pgrst', 'reload schema');
