-- =====================================================================
-- Rukhama Tent House Attendance - core schema
-- =====================================================================

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create sequence if not exists public.employee_code_seq start 1;

-- RTH-0001 ... RTH-9999, RTH-10000 (never truncates)
create or replace function public.next_employee_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  n bigint := nextval('public.employee_code_seq');
begin
  return 'RTH-' || lpad(n::text, greatest(4, length(n::text)), '0');
end;
$$;

-- ---------- admins ----------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text not null default 'Admin',
  created_at timestamptz not null default now()
);

-- ---------- employees ----------
create table if not exists public.employees (
  id            uuid primary key default gen_random_uuid(),
  employee_code text not null unique default public.next_employee_code(),
  full_name     text not null check (char_length(btrim(full_name)) between 1 and 120),
  phone         text,
  address       text,
  role          text not null default 'Labour'
                check (role in ('Labour', 'Driver', 'Decorator', 'Supervisor', 'Other')),
  daily_wage    numeric(10, 2) not null default 0 check (daily_wage >= 0),
  photo_path    text,
  status        text not null default 'ACTIVE' check (status in ('ACTIVE', 'EXITED')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists employees_status_idx on public.employees (status);
create index if not exists employees_full_name_idx on public.employees (full_name);

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

-- ---------- employment periods (join / exit / rejoin history) ----------
-- exit_date is the LAST working day (inclusive).
create table if not exists public.employment_periods (
  id               uuid primary key default gen_random_uuid(),
  -- restrict: history must never be deleted by accident
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
-- at most one open (not exited) period per employee
create unique index if not exists employment_periods_one_open_idx
  on public.employment_periods (employee_id) where exit_date is null;

-- ---------- attendance ----------
create table if not exists public.attendance (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references public.employees (id) on delete restrict,
  date           date not null,
  status         text not null check (status in ('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE')),
  overtime_hours numeric(4, 1) not null default 0 check (overtime_hours between 0 and 24),
  note           text,
  marked_at      timestamptz not null default now(),
  -- this unique constraint also provides the (employee_id, date) index
  constraint attendance_employee_date_key unique (employee_id, date)
);

create index if not exists attendance_date_idx on public.attendance (date);
