-- ANVEL Contractor Portal
-- Phase 11: private storage bucket foundation for contractor invoices.
--
-- Apply only to the development Supabase project first.
-- Do not apply to production until invoice access has been reviewed.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'contractor-invoices',
  'contractor-invoices',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf'];

drop policy if exists "contractor_invoices_storage_admin_all"
on storage.objects;

drop policy if exists "contractor_invoices_storage_select_own"
on storage.objects;

drop policy if exists "contractor_invoices_storage_insert_own"
on storage.objects;

create policy "contractor_invoices_storage_admin_all"
on storage.objects for all to authenticated
using (
  bucket_id = 'contractor-invoices'
  and public.is_admin()
)
with check (
  bucket_id = 'contractor-invoices'
  and public.is_admin()
);

create policy "contractor_invoices_storage_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'contractor-invoices'
  and (storage.foldername(name))[1] = 'contractors'
  and exists (
    select 1
    from public.contractors c
    where c.id::text = (storage.foldername(name))[2]
      and c.profile_id = auth.uid()
  )
);

create policy "contractor_invoices_storage_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'contractor-invoices'
  and (storage.foldername(name))[1] = 'contractors'
  and (storage.foldername(name))[3] = 'invoices'
  and lower(right(name, 4)) = '.pdf'
  and exists (
    select 1
    from public.contractors c
    where c.id::text = (storage.foldername(name))[2]
      and c.profile_id = auth.uid()
  )
);
