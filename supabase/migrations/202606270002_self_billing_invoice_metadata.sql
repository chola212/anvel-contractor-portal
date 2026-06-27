-- Add self-billing invoice metadata while keeping contractor-uploaded invoices compatible.

alter table public.invoices
  add column if not exists invoice_type text not null default 'contractor_uploaded',
  add column if not exists timesheet_id uuid references public.timesheets(id) on delete set null,
  add column if not exists generated_by uuid references public.profiles(id) on delete set null,
  add column if not exists generated_at timestamptz,
  add column if not exists emailed_at timestamptz,
  add column if not exists email_status text not null default 'not_sent';

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
      check (invoice_type in ('self_billing', 'contractor_uploaded'));
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

create unique index if not exists invoices_self_billing_timesheet_unique_idx
  on public.invoices(timesheet_id)
  where invoice_type = 'self_billing' and timesheet_id is not null;

create unique index if not exists invoices_self_billing_invoice_number_unique_idx
  on public.invoices(invoice_number)
  where invoice_type = 'self_billing';

create index if not exists invoices_timesheet_id_idx on public.invoices(timesheet_id);
create index if not exists invoices_invoice_type_idx on public.invoices(invoice_type);
create index if not exists payments_invoice_status_idx on public.payments(invoice_id, status);
