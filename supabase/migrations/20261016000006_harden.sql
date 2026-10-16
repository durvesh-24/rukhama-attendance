-- =====================================================================
-- Security hardening
-- =====================================================================

-- History must never be lost: the app never deletes employees or their
-- join/exit periods, so nobody (not even a logged-in admin session) may.
-- Attendance marks can still be removed (un-marking a shift).
drop policy if exists "employees_delete" on public.employees;
drop policy if exists "periods_delete" on public.employment_periods;
revoke delete on public.employees, public.employment_periods from authenticated;

-- Trigger helper does not need to be callable through the API.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
