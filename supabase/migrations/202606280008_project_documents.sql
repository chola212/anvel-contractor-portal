-- Phase 1 admin-only project document storage.
-- These documents are internal client/vendor/intermediary project files.
-- They are deliberately separate from contractor_documents and contractor buckets.

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  contractor_id uuid references public.contractors(id) on delete set null,
  consultant_name text,
  document_type text not null
    check (
      document_type in (
        'Purchase Order',
        'Client Contract',
        'Statement of Work',
        'Work Order',
        'Rate Confirmation',
        'Client NDA',
        'Client Timesheet Approval',
        'Other'
      )
    ),
  title text not null check (char_length(btrim(title)) > 0),
  document_date date,
  file_path text not null,
  file_name text not null,
  mime_type text,
  file_size_bytes bigint check (
    file_size_bytes is null
    or file_size_bytes between 0 and 10485760
  ),
  status text not null default 'active'
    check (status in ('active', 'archived')),
  notes text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_documents_project_id_idx
  on public.project_documents(project_id);

create index if not exists project_documents_contractor_id_idx
  on public.project_documents(contractor_id);

create index if not exists project_documents_status_idx
  on public.project_documents(status);

drop trigger if exists project_documents_set_updated_at
on public.project_documents;

create trigger project_documents_set_updated_at
before update on public.project_documents
for each row execute function public.set_updated_at();

alter table public.project_documents enable row level security;

drop policy if exists "project_documents_admin_all"
on public.project_documents;

create policy "project_documents_admin_all"
on public.project_documents for all to authenticated
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
  'project-documents',
  'project-documents',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf'];

drop policy if exists "project_documents_storage_admin_all"
on storage.objects;

create policy "project_documents_storage_admin_all"
on storage.objects for all to authenticated
using (
  bucket_id = 'project-documents'
  and public.is_admin()
)
with check (
  bucket_id = 'project-documents'
  and public.is_admin()
);

select pg_notify('pgrst', 'reload schema');
