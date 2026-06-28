-- Allow admin-created project-based outgoing invoice drafts without a timesheet.

alter table public.outgoing_invoices
  add column if not exists invoice_source text not null default 'timesheet',
  add column if not exists period_label text;

update public.outgoing_invoices
set invoice_source = 'timesheet'
where invoice_source is null;

alter table public.outgoing_invoices
  drop constraint if exists outgoing_invoices_invoice_source_check;
alter table public.outgoing_invoices
  add constraint outgoing_invoices_invoice_source_check
  check (invoice_source in ('timesheet', 'manual'));

alter table public.outgoing_invoices
  alter column timesheet_id drop not null,
  alter column contractor_id drop not null;

alter table public.outgoing_invoices
  drop constraint if exists outgoing_invoices_source_links_check;
alter table public.outgoing_invoices
  add constraint outgoing_invoices_source_links_check
  check (
    (
      invoice_source = 'timesheet'
      and timesheet_id is not null
      and contractor_id is not null
    )
    or (
      invoice_source = 'manual'
      and timesheet_id is null
      and contractor_id is null
      and project_id is not null
      and nullif(btrim(consultant_name), '') is not null
    )
  );

create index if not exists outgoing_invoices_invoice_source_idx
  on public.outgoing_invoices(invoice_source);

select pg_notify('pgrst', 'reload schema');
