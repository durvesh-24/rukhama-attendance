-- =====================================================================
-- Restore employment_periods and attendance (they were dropped by hand
-- in the Supabase Table Editor). Recreates the final structure from
-- migrations 0001, 0002, 0005 and 0006. Safe to run more than once.
-- =====================================================================

create table if not exists public.employment_periods (
  id               uuid primary key default gen_random_uuid(),
  employee_id      uuid not null references public.employees (id) on delete restrict,
  join_date        date not null,
  join_description text,
  exit_date        date,
  exit_description text,
  created_at       timestamptz not null default now(),
  constraint employment_periods_dates_chk check (exit_date is null or exit_date >= join_date)
);

create index if not exists employment_periods_employee_idx
  on public.employment_periods (employee_id, join_date);
create index if not exists employment_periods_dates_idx
  on public.employment_periods (join_date, exit_date);
create unique index if not exists employment_periods_one_open_idx
  on public.employment_periods (employee_id) where exit_date is null;

create table if not exists public.attendance (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references public.employees (id) on delete restrict,
  date           date not null,
  shift          text not null,
  status         text not null,
  overtime_hours numeric(4, 1) not null default 0 check (overtime_hours between 0 and 24),
  note           text,
  marked_at      timestamptz not null default now(),
  constraint attendance_shift_check check (shift in ('MORNING', 'EVENING', 'NIGHT')),
  constraint attendance_status_check check (status in ('PRESENT', 'ABSENT', 'LEAVE')),
  constraint attendance_night_present_check check (shift <> 'NIGHT' or status = 'PRESENT'),
  constraint attendance_employee_date_shift_key unique (employee_id, date, shift)
);

create index if not exists attendance_date_idx on public.attendance (date);

-- ---------- security (same as before) ----------
alter table public.employment_periods enable row level security;
alter table public.attendance enable row level security;

revoke all on public.employment_periods, public.attendance from anon;
grant select, insert, update on public.employment_periods to authenticated;
grant select, insert, update, delete on public.attendance to authenticated;
-- join/exit history can never be deleted through the API
revoke delete on public.employment_periods from authenticated;

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
