-- Phase 1 outgoing client invoices generated from approved timesheets.
-- Billing and sender records are admin-only and invoices retain immutable
-- snapshots so later settings changes do not alter historical documents.

create table public.company_invoice_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key boolean not null default true unique check (singleton_key),
  company_legal_name text not null,
  trading_name text,
  company_address text not null,
  company_city_region text,
  company_country text not null,
  company_vat_number text not null,
  invoice_sender_name text,
  default_invoice_notes text,
  bank_name text not null,
  bank_account_name text not null,
  iban text not null,
  swift_bic text not null,
  default_payment_terms_days integer not null default 30
    check (default_payment_terms_days = 30),
  default_currency text not null default 'EUR'
    check (default_currency = 'EUR'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_billing_details (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade unique,
  billing_legal_name text not null,
  billing_email text not null,
  billing_cc_emails text[] not null default '{}',
  billing_address text not null,
  billing_country text not null,
  billing_vat_number text not null,
  po_reference text,
  vat_treatment text not null
    check (
      vat_treatment in (
        'cyprus_vat_19',
        'eu_reverse_charge_0',
        'non_eu_outside_scope',
        'manual_review'
      )
    ),
  default_invoice_description text,
  invoice_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outgoing_invoice_sequences (
  year integer primary key check (year >= 2024 and year <= 2100),
  last_number integer not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now()
);

create table public.outgoing_invoices (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references public.timesheets(id) on delete restrict unique,
  project_id uuid not null references public.projects(id) on delete restrict,
  contractor_id uuid not null references public.contractors(id) on delete restrict,
  invoice_number text not null unique,
  invoice_date date not null,
  due_date date not null,
  year integer not null check (year >= 2024 and year <= 2100),
  month integer not null check (month >= 1 and month <= 12),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  currency text not null default 'EUR' check (currency = 'EUR'),
  company_legal_name text not null,
  company_trading_name text,
  company_address text not null,
  company_city_region text,
  company_country text not null,
  company_vat_number text not null,
  company_bank_name text not null,
  company_bank_account_name text not null,
  company_iban text not null,
  company_swift_bic text not null,
  company_invoice_notes text,
  billing_legal_name text not null,
  billing_email text not null,
  billing_cc_emails text[] not null default '{}',
  billing_address text not null,
  billing_country text not null,
  billing_vat_number text not null,
  po_reference text,
  billing_invoice_notes text,
  project_name text not null,
  consultant_name text not null,
  consultant_email text,
  quantity numeric(10, 2) not null check (quantity >= 0),
  unit_label text not null default 'hours',
  sales_rate numeric(12, 2) not null check (sales_rate >= 0),
  net_amount numeric(12, 2) not null check (net_amount >= 0),
  vat_treatment text not null
    check (
      vat_treatment in (
        'cyprus_vat_19',
        'eu_reverse_charge_0',
        'non_eu_outside_scope',
        'manual_review'
      )
    ),
  vat_rate numeric(5, 2) not null default 0 check (vat_rate >= 0),
  vat_amount numeric(12, 2) not null default 0 check (vat_amount >= 0),
  gross_amount numeric(12, 2) not null check (gross_amount >= 0),
  pdf_file_path text,
  pdf_file_name text,
  email_status text not null default 'not_sent'
    check (email_status in ('not_sent', 'sent', 'failed')),
  sent_at timestamptz,
  paid_at timestamptz,
  paid_amount numeric(12, 2) check (paid_amount is null or paid_amount >= 0),
  payment_reference text,
  internal_note text,
  created_by uuid references public.profiles(id) on delete set null,
  sent_by uuid references public.profiles(id) on delete set null,
  paid_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_date = invoice_date + 30)
);

create table public.outgoing_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  outgoing_invoice_id uuid not null
    references public.outgoing_invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10, 2) not null check (quantity >= 0),
  unit_label text not null default 'hours',
  unit_rate numeric(12, 2) not null check (unit_rate >= 0),
  net_amount numeric(12, 2) not null check (net_amount >= 0),
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create index outgoing_invoices_status_idx on public.outgoing_invoices(status);
create index outgoing_invoices_billing_legal_name_idx
  on public.outgoing_invoices(billing_legal_name);
create index outgoing_invoices_project_id_idx on public.outgoing_invoices(project_id);
create index outgoing_invoices_contractor_id_idx
  on public.outgoing_invoices(contractor_id);
create index outgoing_invoices_year_month_idx
  on public.outgoing_invoices(year, month);
create index outgoing_invoice_lines_invoice_id_idx
  on public.outgoing_invoice_lines(outgoing_invoice_id);

create trigger company_invoice_settings_set_updated_at
before update on public.company_invoice_settings
for each row execute function public.set_updated_at();

create trigger project_billing_details_set_updated_at
before update on public.project_billing_details
for each row execute function public.set_updated_at();

create trigger outgoing_invoices_set_updated_at
before update on public.outgoing_invoices
for each row execute function public.set_updated_at();

create or replace function public.next_outgoing_invoice_number(invoice_year integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number integer;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if invoice_year < 2024 or invoice_year > 2100 then
    raise exception 'Invalid invoice year';
  end if;

  insert into public.outgoing_invoice_sequences (year, last_number)
  values (invoice_year, 1)
  on conflict (year) do update
    set last_number = public.outgoing_invoice_sequences.last_number + 1,
        updated_at = now()
  returning last_number into next_number;

  return format('ANVEL-%s-%s', invoice_year, lpad(next_number::text, 4, '0'));
end;
$$;

revoke all on function public.next_outgoing_invoice_number(integer) from public;
grant execute on function public.next_outgoing_invoice_number(integer)
to authenticated;

alter table public.company_invoice_settings enable row level security;
alter table public.project_billing_details enable row level security;
alter table public.outgoing_invoice_sequences enable row level security;
alter table public.outgoing_invoices enable row level security;
alter table public.outgoing_invoice_lines enable row level security;

create policy "company_invoice_settings_admin_all"
on public.company_invoice_settings for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "project_billing_details_admin_all"
on public.project_billing_details for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "outgoing_invoice_sequences_admin_select"
on public.outgoing_invoice_sequences for select to authenticated
using (public.is_admin());

create policy "outgoing_invoices_admin_all"
on public.outgoing_invoices for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "outgoing_invoice_lines_admin_all"
on public.outgoing_invoice_lines for all to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'outgoing-invoices',
  'outgoing-invoices',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf'];

create policy "outgoing_invoices_storage_admin_all"
on storage.objects for all to authenticated
using (
  bucket_id = 'outgoing-invoices'
  and public.is_admin()
)
with check (
  bucket_id = 'outgoing-invoices'
  and public.is_admin()
);
