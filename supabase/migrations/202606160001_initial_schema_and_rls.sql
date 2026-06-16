-- ANVEL Contractor Portal
-- Phase 3: initial PostgreSQL schema and Row Level Security foundation.
--
-- Apply only to a development/staging Supabase project with fake data first.
-- Do not apply to production until the security checklist has been reviewed.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'contractor'
    check (role in ('admin', 'operations', 'contractor')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contractors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  legal_name text not null,
  trading_name text,
  email text not null,
  phone text,
  country text,
  supplier_type text
    check (supplier_type in ('limited_company', 'self_employed', 'sole_trader', 'other')),
  company_registration_number text,
  vat_number text,
  tax_number text,
  fiscal_address text,
  vat_treatment text
    check (
      vat_treatment is null
      or vat_treatment in (
        'eu_reverse_charge',
        'cyprus_vat_19',
        'non_eu_accountant_review',
        'eu_no_vat_accountant_review'
      )
    ),
  bank_account_holder text,
  iban text,
  swift_bic text,
  bank_currency text not null default 'EUR' check (bank_currency = 'EUR'),
  status text not null default 'draft'
    check (status in ('draft', 'invited', 'active', 'paused', 'offboarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_label text,
  country text,
  start_date date,
  end_date date,
  status text not null default 'planned'
    check (status in ('planned', 'active', 'paused', 'closed')),
  currency text not null default 'EUR' check (currency = 'EUR'),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.contractor_projects (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  hourly_rate numeric(12, 2) not null check (hourly_rate >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  sales_rate numeric(12, 2) check (sales_rate is null or sales_rate >= 0),
  start_date date,
  end_date date,
  status text not null default 'active'
    check (status in ('planned', 'active', 'paused', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contractor_id, project_id, start_date),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.document_requirements (
  id uuid primary key default gen_random_uuid(),
  supplier_type text
    check (
      supplier_type is null
      or supplier_type in ('limited_company', 'self_employed', 'sole_trader', 'other')
    ),
  name text not null,
  is_required boolean not null default true,
  requires_expiry_date boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.contractor_documents (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete restrict,
  document_requirement_id uuid references public.document_requirements(id) on delete set null,
  document_type text not null,
  file_path text not null,
  file_name text not null,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes > 0),
  status text not null default 'uploaded'
    check (status in ('missing', 'uploaded', 'approved', 'rejected', 'expired')),
  expiry_date date,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (mime_type is null or mime_type = 'application/pdf')
);

create table public.timesheets (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  year int not null check (year >= 2024 and year <= 2100),
  month int not null check (month >= 1 and month <= 12),
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'rejected', 'reopened', 'locked')),
  submitted_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  rejected_by uuid references public.profiles(id) on delete set null,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contractor_id, project_id, year, month)
);

create table public.timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  work_date date not null,
  hours numeric(5, 2) not null check (hours >= 0 and hours <= 24),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (timesheet_id, work_date)
);

create table public.payment_statements (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references public.timesheets(id) on delete restrict,
  contractor_id uuid not null references public.contractors(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  total_hours numeric(8, 2) not null check (total_hours >= 0),
  hourly_rate numeric(12, 2) not null check (hourly_rate >= 0),
  net_amount numeric(12, 2) not null check (net_amount >= 0),
  vat_treatment text not null
    check (
      vat_treatment in (
        'eu_reverse_charge',
        'cyprus_vat_19',
        'non_eu_accountant_review',
        'eu_no_vat_accountant_review'
      )
    ),
  vat_amount numeric(12, 2) not null default 0 check (vat_amount >= 0),
  gross_amount numeric(12, 2) not null check (gross_amount >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  payment_statement_id uuid references public.payment_statements(id) on delete set null,
  contractor_id uuid not null references public.contractors(id) on delete restrict,
  invoice_number text not null,
  invoice_date date not null,
  net_amount numeric(12, 2) not null check (net_amount >= 0),
  vat_amount numeric(12, 2) not null default 0 check (vat_amount >= 0),
  gross_amount numeric(12, 2) not null check (gross_amount >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  file_path text not null,
  file_name text not null,
  status text not null default 'uploaded'
    check (
      status in (
        'pending_upload',
        'uploaded',
        'checked',
        'correction_required',
        'approved_for_payment',
        'paid',
        'on_hold'
      )
    ),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'paid', 'on_hold')),
  payment_date date,
  payment_reference text,
  paid_amount numeric(12, 2) check (paid_amount is null or paid_amount >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);
create index contractors_profile_id_idx on public.contractors(profile_id);
create index contractors_status_idx on public.contractors(status);
create index projects_status_idx on public.projects(status);
create index contractor_projects_contractor_id_idx on public.contractor_projects(contractor_id);
create index contractor_projects_project_id_idx on public.contractor_projects(project_id);
create index contractor_documents_contractor_id_idx on public.contractor_documents(contractor_id);
create index contractor_documents_status_idx on public.contractor_documents(status);
create index timesheets_contractor_id_idx on public.timesheets(contractor_id);
create index timesheets_project_id_idx on public.timesheets(project_id);
create index timesheets_status_idx on public.timesheets(status);
create index timesheet_entries_timesheet_id_idx on public.timesheet_entries(timesheet_id);
create index payment_statements_contractor_id_idx on public.payment_statements(contractor_id);
create index payment_statements_timesheet_id_idx on public.payment_statements(timesheet_id);
create index invoices_contractor_id_idx on public.invoices(contractor_id);
create index invoices_status_idx on public.invoices(status);
create index payments_invoice_id_idx on public.payments(invoice_id);
create index payments_status_idx on public.payments(status);
create index audit_logs_actor_profile_id_idx on public.audit_logs(actor_profile_id);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger contractors_set_updated_at
before update on public.contractors
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger contractor_projects_set_updated_at
before update on public.contractor_projects
for each row execute function public.set_updated_at();

create trigger contractor_documents_set_updated_at
before update on public.contractor_documents
for each row execute function public.set_updated_at();

create trigger timesheets_set_updated_at
before update on public.timesheets
for each row execute function public.set_updated_at();

create trigger timesheet_entries_set_updated_at
before update on public.timesheet_entries
for each row execute function public.set_updated_at();

create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.is_operations()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'operations', false);
$$;

create or replace function public.owns_contractor(target_contractor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.contractors c
    where c.id = target_contractor_id
      and c.profile_id = auth.uid()
  );
$$;

create or replace function public.owns_timesheet(target_timesheet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.timesheets t
    join public.contractors c on c.id = t.contractor_id
    where t.id = target_timesheet_id
      and c.profile_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.contractors enable row level security;
alter table public.projects enable row level security;
alter table public.contractor_projects enable row level security;
alter table public.document_requirements enable row level security;
alter table public.contractor_documents enable row level security;
alter table public.timesheets enable row level security;
alter table public.timesheet_entries enable row level security;
alter table public.payment_statements enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_operations() to authenticated;
grant execute on function public.owns_contractor(uuid) to authenticated;
grant execute on function public.owns_timesheet(uuid) to authenticated;

create policy "profiles_select_own_or_staff"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin() or public.is_operations());

create policy "profiles_admin_manage"
on public.profiles for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "contractors_select_allowed"
on public.contractors for select to authenticated
using (public.is_admin() or public.is_operations() or profile_id = auth.uid());

create policy "contractors_admin_manage"
on public.contractors for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "projects_select_allowed"
on public.projects for select to authenticated
using (
  public.is_admin()
  or public.is_operations()
  or exists (
    select 1
    from public.contractor_projects cp
    join public.contractors c on c.id = cp.contractor_id
    where cp.project_id = projects.id
      and c.profile_id = auth.uid()
  )
);

create policy "projects_admin_manage"
on public.projects for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "contractor_projects_select_allowed"
on public.contractor_projects for select to authenticated
using (
  public.is_admin()
  or public.is_operations()
  or public.owns_contractor(contractor_id)
);

create policy "contractor_projects_admin_manage"
on public.contractor_projects for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "document_requirements_select_authenticated"
on public.document_requirements for select to authenticated
using (true);

create policy "document_requirements_admin_manage"
on public.document_requirements for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "contractor_documents_select_allowed"
on public.contractor_documents for select to authenticated
using (
  public.is_admin()
  or public.is_operations()
  or public.owns_contractor(contractor_id)
);

create policy "contractor_documents_insert_own_or_admin"
on public.contractor_documents for insert to authenticated
with check (public.is_admin() or public.owns_contractor(contractor_id));

create policy "contractor_documents_admin_update_delete"
on public.contractor_documents for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "timesheets_select_allowed"
on public.timesheets for select to authenticated
using (
  public.is_admin()
  or public.is_operations()
  or public.owns_contractor(contractor_id)
);

create policy "timesheets_insert_own_or_admin"
on public.timesheets for insert to authenticated
with check (public.is_admin() or public.owns_contractor(contractor_id));

create policy "timesheets_update_admin"
on public.timesheets for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "timesheets_update_own_unapproved"
on public.timesheets for update to authenticated
using (
  public.owns_contractor(contractor_id)
  and status in ('draft', 'rejected', 'reopened')
)
with check (
  public.owns_contractor(contractor_id)
  and status in ('draft', 'submitted')
);

create policy "timesheet_entries_select_allowed"
on public.timesheet_entries for select to authenticated
using (
  public.is_admin()
  or public.is_operations()
  or public.owns_timesheet(timesheet_id)
);

create policy "timesheet_entries_insert_own_editable"
on public.timesheet_entries for insert to authenticated
with check (
  public.owns_timesheet(timesheet_id)
  and exists (
    select 1
    from public.timesheets t
    where t.id = timesheet_entries.timesheet_id
      and t.status in ('draft', 'rejected', 'reopened')
  )
);

create policy "timesheet_entries_update_delete_own_editable"
on public.timesheet_entries for all to authenticated
using (
  public.owns_timesheet(timesheet_id)
  and exists (
    select 1
    from public.timesheets t
    where t.id = timesheet_entries.timesheet_id
      and t.status in ('draft', 'rejected', 'reopened')
  )
)
with check (
  public.owns_timesheet(timesheet_id)
  and exists (
    select 1
    from public.timesheets t
    where t.id = timesheet_entries.timesheet_id
      and t.status in ('draft', 'rejected', 'reopened')
  )
);

create policy "timesheet_entries_admin_manage"
on public.timesheet_entries for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "payment_statements_select_allowed"
on public.payment_statements for select to authenticated
using (
  public.is_admin()
  or public.is_operations()
  or public.owns_contractor(contractor_id)
);

create policy "payment_statements_admin_manage"
on public.payment_statements for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "invoices_select_allowed"
on public.invoices for select to authenticated
using (
  public.is_admin()
  or public.is_operations()
  or public.owns_contractor(contractor_id)
);

create policy "invoices_insert_own_or_admin"
on public.invoices for insert to authenticated
with check (public.is_admin() or public.owns_contractor(contractor_id));

create policy "invoices_update_admin"
on public.invoices for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "payments_select_allowed"
on public.payments for select to authenticated
using (
  public.is_admin()
  or public.is_operations()
  or exists (
    select 1
    from public.invoices i
    where i.id = payments.invoice_id
      and public.owns_contractor(i.contractor_id)
  )
);

create policy "payments_admin_manage"
on public.payments for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "audit_logs_admin_select"
on public.audit_logs for select to authenticated
using (public.is_admin());

create policy "audit_logs_admin_insert"
on public.audit_logs for insert to authenticated
with check (public.is_admin());
