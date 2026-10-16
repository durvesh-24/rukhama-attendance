-- =====================================================================
-- Admin check + Row Level Security
-- =====================================================================

-- True only when the logged-in user is listed in public.admins.
-- security definer so it can read admins regardless of RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.admins             enable row level security;
alter table public.employees          enable row level security;
alter table public.employment_periods enable row level security;
alter table public.attendance         enable row level security;

-- Anonymous visitors get nothing at all (defence in depth on top of RLS).
revoke all on public.admins, public.employees, public.employment_periods, public.attendance from anon;
revoke all on sequence public.employee_code_seq from anon;

-- admins: readable by admins; rows are only added by the make-admin script
-- (service role, bypasses RLS) or via the Supabase SQL editor.
drop policy if exists "admins_select" on public.admins;
create policy "admins_select" on public.admins
  for select to authenticated
  using ((select public.is_admin()));

-- employees
drop policy if exists "employees_select" on public.employees;
drop policy if exists "employees_insert" on public.employees;
drop policy if exists "employees_update" on public.employees;
drop policy if exists "employees_delete" on public.employees;
create policy "employees_select" on public.employees
  for select to authenticated using ((select public.is_admin()));
create policy "employees_insert" on public.employees
  for insert to authenticated with check ((select public.is_admin()));
create policy "employees_update" on public.employees
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "employees_delete" on public.employees
  for delete to authenticated using ((select public.is_admin()));

-- employment_periods
drop policy if exists "periods_select" on public.employment_periods;
drop policy if exists "periods_insert" on public.employment_periods;
drop policy if exists "periods_update" on public.employment_periods;
drop policy if exists "periods_delete" on public.employment_periods;
create policy "periods_select" on public.employment_periods
  for select to authenticated using ((select public.is_admin()));
create policy "periods_insert" on public.employment_periods
  for insert to authenticated with check ((select public.is_admin()));
create policy "periods_update" on public.employment_periods
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "periods_delete" on public.employment_periods
  for delete to authenticated using ((select public.is_admin()));

-- attendance
drop policy if exists "attendance_select" on public.attendance;
drop policy if exists "attendance_insert" on public.attendance;
drop policy if exists "attendance_update" on public.attendance;
drop policy if exists "attendance_delete" on public.attendance;
create policy "attendance_select" on public.attendance
  for select to authenticated using ((select public.is_admin()));
create policy "attendance_insert" on public.attendance
  for insert to authenticated with check ((select public.is_admin()));
create policy "attendance_update" on public.attendance
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "attendance_delete" on public.attendance
  for delete to authenticated using ((select public.is_admin()));
