-- Admin-only contractor onboarding document archive.
-- Stores generated onboarding PDFs sent by email; contractors do not access
-- these internal copies in phase 1.

create table if not exists public.contractor_onboarding_documents (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid references public.contractors(id) on delete set null,
  document_type text not null
    check (
      document_type in (
        'framework_agreement',
        'assignment_schedule',
        'nda_data_protection'
      )
    ),
  file_name text not null,
  file_path text not null,
  sent_to text not null,
  sent_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists contractor_onboarding_documents_contractor_id_idx
  on public.contractor_onboarding_documents(contractor_id);

create index if not exists contractor_onboarding_documents_document_type_idx
  on public.contractor_onboarding_documents(document_type);

create index if not exists contractor_onboarding_documents_created_at_idx
  on public.contractor_onboarding_documents(created_at desc);

alter table public.contractor_onboarding_documents enable row level security;

drop policy if exists "contractor_onboarding_documents_admin_all"
on public.contractor_onboarding_documents;

create policy "contractor_onboarding_documents_admin_all"
on public.contractor_onboarding_documents for all to authenticated
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
  'contractor-onboarding-documents',
  'contractor-onboarding-documents',
  false,
  20971520,
  array['application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = array['application/pdf'];

drop policy if exists "contractor_onboarding_documents_storage_admin_all"
on storage.objects;

create policy "contractor_onboarding_documents_storage_admin_all"
on storage.objects for all to authenticated
using (
  bucket_id = 'contractor-onboarding-documents'
  and public.is_admin()
)
with check (
  bucket_id = 'contractor-onboarding-documents'
  and public.is_admin()
);

select pg_notify('pgrst', 'reload schema');
