-- =====================================================================
-- Shift-based attendance
--   MORNING = Shift 1 (8:00 AM - 1:00 PM)
--   EVENING = Shift 2 (3:00 PM - 8:00 PM)
--   NIGHT   = extra night shift (9:00 PM onwards), only stored when worked
-- Pay: each day shift = daily_wage / 2,
--      each night shift = night_wage (or daily_wage / 2 when not set)
-- =====================================================================

-- ---------- employees: optional night shift pay ----------
alter table public.employees
  add column if not exists night_wage numeric(10, 2) check (night_wage is null or night_wage >= 0);

-- ---------- attendance: one row per employee, date and shift ----------
alter table public.attendance drop constraint if exists attendance_employee_date_key;
alter table public.attendance drop constraint if exists attendance_status_check;
alter table public.attendance add column if not exists shift text;

-- Convert any old one-row-per-day records into two day-shift rows:
-- PRESENT -> P + P, HALF_DAY -> P + A, ABSENT -> A + A, LEAVE -> L + L
insert into public.attendance (employee_id, date, shift, status, overtime_hours, note, marked_at)
select
  employee_id,
  date,
  'EVENING',
  case status when 'PRESENT' then 'PRESENT' when 'LEAVE' then 'LEAVE' else 'ABSENT' end,
  0,
  null,
  marked_at
from public.attendance
where shift is null;

update public.attendance
set shift = 'MORNING',
    status = case when status = 'HALF_DAY' then 'PRESENT' else status end
where shift is null;

alter table public.attendance alter column shift set not null;

alter table public.attendance
  add constraint attendance_shift_check check (shift in ('MORNING', 'EVENING', 'NIGHT'));
alter table public.attendance
  add constraint attendance_status_check check (status in ('PRESENT', 'ABSENT', 'LEAVE'));
-- a night shift row only exists when the employee worked it
alter table public.attendance
  add constraint attendance_night_present_check check (shift <> 'NIGHT' or status = 'PRESENT');
alter table public.attendance
  add constraint attendance_employee_date_shift_key unique (employee_id, date, shift);

-- ---------- summary for any date range ----------
drop function if exists public.attendance_summary(date, date, uuid[]);

create function public.attendance_summary(
  p_start date,
  p_end date,
  p_employee_ids uuid[] default null
)
returns table (
  employee_id     uuid,
  employee_code   text,
  full_name       text,
  role            text,
  status          text,
  daily_wage      numeric,
  night_wage      numeric,
  shift1_present  integer,
  shift2_present  integer,
  night_shifts    integer,
  absent_shifts   integer,
  leave_shifts    integer,
  leave_days      integer,
  days_worked     integer,
  payable         numeric
)
language sql
stable
set search_path = ''
as $$
  with emp as (
    select e.*
    from public.employees e
    where (p_employee_ids is null or e.id = any (p_employee_ids))
      and (
        exists (
          select 1 from public.employment_periods p
          where p.employee_id = e.id
            and p.join_date <= p_end
            and (p.exit_date is null or p.exit_date >= p_start)
        )
        or exists (
          select 1 from public.attendance a
          where a.employee_id = e.id and a.date between p_start and p_end
        )
      )
  ),
  agg as (
    select
      a.employee_id,
      count(*) filter (where a.shift = 'MORNING' and a.status = 'PRESENT') as s1,
      count(*) filter (where a.shift = 'EVENING' and a.status = 'PRESENT') as s2,
      count(*) filter (where a.shift = 'NIGHT') as night,
      count(*) filter (where a.status = 'ABSENT') as absent,
      count(*) filter (where a.status = 'LEAVE') as leave,
      count(distinct a.date) filter (where a.status = 'LEAVE') as leave_days,
      count(distinct a.date) filter (where a.status = 'PRESENT') as days_worked
    from public.attendance a
    where a.date between p_start and p_end
      and a.employee_id in (select id from emp)
    group by a.employee_id
  )
  select
    e.id,
    e.employee_code,
    e.full_name,
    e.role,
    e.status,
    e.daily_wage,
    coalesce(e.night_wage, round(e.daily_wage / 2, 2)),
    coalesce(g.s1, 0)::integer,
    coalesce(g.s2, 0)::integer,
    coalesce(g.night, 0)::integer,
    coalesce(g.absent, 0)::integer,
    coalesce(g.leave, 0)::integer,
    coalesce(g.leave_days, 0)::integer,
    coalesce(g.days_worked, 0)::integer,
    round(
      (coalesce(g.s1, 0) + coalesce(g.s2, 0)) * e.daily_wage / 2
      + coalesce(g.night, 0) * coalesce(e.night_wage, e.daily_wage / 2),
      2
    )::numeric
  from emp e
  left join agg g on g.employee_id = e.id
  order by e.full_name;
$$;

-- ---------- daily counts for charts ----------
drop function if exists public.daily_attendance_counts(date, date);

create function public.daily_attendance_counts(p_start date, p_end date)
returns table (
  day             date,
  shift1_present  integer,
  shift2_present  integer,
  night           integer,
  absent          integer,
  leave           integer,
  active          integer
)
language sql
stable
set search_path = ''
as $$
  select
    d.day,
    count(a.id) filter (where a.shift = 'MORNING' and a.status = 'PRESENT')::integer,
    count(a.id) filter (where a.shift = 'EVENING' and a.status = 'PRESENT')::integer,
    count(a.id) filter (where a.shift = 'NIGHT')::integer,
    count(a.id) filter (where a.status = 'ABSENT')::integer,
    count(a.id) filter (where a.status = 'LEAVE')::integer,
    (
      select count(*) from public.employment_periods p
      where p.join_date <= d.day and (p.exit_date is null or p.exit_date >= d.day)
    )::integer
  from (select g::date as day from generate_series(p_start, p_end, interval '1 day') g) d
  left join public.attendance a on a.date = d.day
  group by d.day
  order by d.day;
$$;

-- ---------- create_employee now takes night pay ----------
drop function if exists public.create_employee(text, text, text, text, numeric, date, text);

create function public.create_employee(
  p_full_name text,
  p_phone text,
  p_address text,
  p_role text,
  p_daily_wage numeric,
  p_join_date date,
  p_join_description text,
  p_night_wage numeric default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  insert into public.employees (full_name, phone, address, role, daily_wage, night_wage, status)
  values (
    btrim(p_full_name),
    nullif(btrim(p_phone), ''),
    nullif(btrim(p_address), ''),
    p_role,
    p_daily_wage,
    p_night_wage,
    'ACTIVE'
  )
  returning id into v_id;

  insert into public.employment_periods (employee_id, join_date, join_description)
  values (v_id, p_join_date, nullif(btrim(p_join_description), ''));

  return v_id;
end;
$$;

revoke execute on function public.attendance_summary(date, date, uuid[]) from public, anon;
revoke execute on function public.daily_attendance_counts(date, date) from public, anon;
revoke execute on function public.create_employee(text, text, text, text, numeric, date, text, numeric) from public, anon;
grant execute on function public.attendance_summary(date, date, uuid[]) to authenticated;
grant execute on function public.daily_attendance_counts(date, date) to authenticated;
grant execute on function public.create_employee(text, text, text, text, numeric, date, text, numeric) to authenticated;
