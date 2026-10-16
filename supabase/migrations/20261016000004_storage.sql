-- =====================================================================
-- Private storage bucket for employee photos (admins only)
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'employee-photos',
  'employee-photos',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "employee_photos_select" on storage.objects;
drop policy if exists "employee_photos_insert" on storage.objects;
drop policy if exists "employee_photos_update" on storage.objects;
drop policy if exists "employee_photos_delete" on storage.objects;

create policy "employee_photos_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'employee-photos' and (select public.is_admin()));

create policy "employee_photos_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'employee-photos' and (select public.is_admin()));

create policy "employee_photos_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'employee-photos' and (select public.is_admin()))
  with check (bucket_id = 'employee-photos' and (select public.is_admin()));

create policy "employee_photos_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'employee-photos' and (select public.is_admin()));
