-- Security hardening for production real-data use.
-- - move assignment sales rates out of contractor-readable rows;
-- - remove operations access to raw contractor rows that include bank details.

create table if not exists public.contractor_project_commercials (
  contractor_project_id uuid primary key
    references public.contractor_projects(id)
    on delete cascade,
  sales_rate numeric(12, 2)
    check (sales_rate is null or sales_rate >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.contractor_project_commercials (
  contractor_project_id,
  sales_rate
)
select
  id,
  sales_rate
from public.contractor_projects
where sales_rate is not null
on conflict (contractor_project_id) do update
  set sales_rate = excluded.sales_rate,
      updated_at = now();

update public.contractor_projects
set sales_rate = null
where sales_rate is not null;

alter table public.contractor_project_commercials
  enable row level security;

drop policy if exists "contractor_project_commercials_admin_all"
on public.contractor_project_commercials;

create policy "contractor_project_commercials_admin_all"
on public.contractor_project_commercials for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop trigger if exists contractor_project_commercials_set_updated_at
on public.contractor_project_commercials;

create trigger contractor_project_commercials_set_updated_at
before update on public.contractor_project_commercials
for each row execute function public.set_updated_at();

drop policy if exists "contractors_select_allowed"
on public.contractors;

create policy "contractors_select_allowed"
on public.contractors for select to authenticated
using (
  public.is_admin()
  or profile_id = auth.uid()
);

select pg_notify('pgrst', 'reload schema');
