-- =====================================================================
-- RPC functions (all SECURITY INVOKER, so RLS still applies)
-- =====================================================================

-- ---------- employees active on a given date ----------
create or replace function public.employees_active_on(p_date date)
returns setof public.employees
language sql
stable
set search_path = ''
as $$
  select e.*
  from public.employees e
  where exists (
    select 1
    from public.employment_periods p
    where p.employee_id = e.id
      and p.join_date <= p_date
      and (p.exit_date is null or p.exit_date >= p_date)
  )
  order by e.full_name;
$$;

-- ---------- per-employee summary for any date range (one or many months) ----------
create or replace function public.attendance_summary(
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
  present_days    integer,
  absent_days     integer,
  half_days       integer,
  leave_days      integer,
  overtime_hours  numeric,
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
      count(*) filter (where a.status = 'PRESENT')  as present_days,
      count(*) filter (where a.status = 'ABSENT')   as absent_days,
      count(*) filter (where a.status = 'HALF_DAY') as half_days,
      count(*) filter (where a.status = 'LEAVE')    as leave_days,
      coalesce(sum(a.overtime_hours), 0)            as overtime_hours
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
    coalesce(g.present_days, 0)::integer,
    coalesce(g.absent_days, 0)::integer,
    coalesce(g.half_days, 0)::integer,
    coalesce(g.leave_days, 0)::integer,
    coalesce(g.overtime_hours, 0)::numeric,
    round(coalesce(g.present_days, 0) * e.daily_wage
          + coalesce(g.half_days, 0) * e.daily_wage / 2, 2)::numeric
  from emp e
  left join agg g on g.employee_id = e.id
  order by e.full_name;
$$;

-- ---------- daily counts for charts ----------
create or replace function public.daily_attendance_counts(p_start date, p_end date)
returns table (
  day       date,
  present   integer,
  absent    integer,
  half_day  integer,
  leave     integer,
  active    integer
)
language sql
stable
set search_path = ''
as $$
  select
    d.day,
    count(a.id) filter (where a.status = 'PRESENT')::integer,
    count(a.id) filter (where a.status = 'ABSENT')::integer,
    count(a.id) filter (where a.status = 'HALF_DAY')::integer,
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

-- ---------- monthly headcount trend ----------
create or replace function public.headcount_trend(
  p_months integer default 12,
  p_until date default (now() at time zone 'Asia/Kolkata')::date
)
returns table (month date, headcount integer, joined integer, exited integer)
language sql
stable
set search_path = ''
as $$
  with months as (
    select
      (date_trunc('month', p_until) - make_interval(months => g))::date as m_start
    from generate_series(0, greatest(p_months, 1) - 1) g
  ),
  bounds as (
    select m_start, (m_start + interval '1 month' - interval '1 day')::date as m_end from months
  )
  select
    b.m_start,
    (
      select count(distinct p.employee_id) from public.employment_periods p
      where p.join_date <= b.m_end and (p.exit_date is null or p.exit_date >= b.m_start)
    )::integer,
    (
      select count(*) from public.employment_periods p
      where p.join_date between b.m_start and b.m_end
    )::integer,
    (
      select count(*) from public.employment_periods p
      where p.exit_date between b.m_start and b.m_end
    )::integer
  from bounds b
  order by b.m_start;
$$;

-- =====================================================================
-- Mutations that must be atomic (employee + employment period together)
-- =====================================================================

create or replace function public.create_employee(
  p_full_name text,
  p_phone text,
  p_address text,
  p_role text,
  p_daily_wage numeric,
  p_join_date date,
  p_join_description text
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

  insert into public.employees (full_name, phone, address, role, daily_wage, status)
  values (
    btrim(p_full_name),
    nullif(btrim(p_phone), ''),
    nullif(btrim(p_address), ''),
    p_role,
    p_daily_wage,
    'ACTIVE'
  )
  returning id into v_id;

  insert into public.employment_periods (employee_id, join_date, join_description)
  values (v_id, p_join_date, nullif(btrim(p_join_description), ''));

  return v_id;
end;
$$;

create or replace function public.exit_employee(
  p_employee_id uuid,
  p_exit_date date,
  p_exit_description text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_period public.employment_periods;
begin
  if not public.is_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  select * into v_period
  from public.employment_periods
  where employee_id = p_employee_id and exit_date is null
  for update;

  if not found then
    raise exception 'This employee is not currently active.';
  end if;

  if p_exit_date < v_period.join_date then
    raise exception 'Exit date cannot be before the join date (%).', to_char(v_period.join_date, 'DD-MM-YYYY');
  end if;

  update public.employment_periods
  set exit_date = p_exit_date,
      exit_description = nullif(btrim(p_exit_description), '')
  where id = v_period.id;

  update public.employees set status = 'EXITED' where id = p_employee_id;
end;
$$;

create or replace function public.rejoin_employee(
  p_employee_id uuid,
  p_join_date date,
  p_join_description text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_last_exit date;
begin
  if not public.is_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  perform 1 from public.employees where id = p_employee_id for update;
  if not found then
    raise exception 'Employee not found.';
  end if;

  if exists (
    select 1 from public.employment_periods
    where employee_id = p_employee_id and exit_date is null
  ) then
    raise exception 'This employee is already active.';
  end if;

  select max(exit_date) into v_last_exit
  from public.employment_periods
  where employee_id = p_employee_id;

  if v_last_exit is not null and p_join_date <= v_last_exit then
    raise exception 'Rejoin date must be after the last exit date (%).', to_char(v_last_exit, 'DD-MM-YYYY');
  end if;

  insert into public.employment_periods (employee_id, join_date, join_description)
  values (p_employee_id, p_join_date, nullif(btrim(p_join_description), ''));

  update public.employees set status = 'ACTIVE' where id = p_employee_id;
end;
$$;

-- Edit dates / descriptions of an existing join-exit period.
create or replace function public.update_employment_period(
  p_period_id uuid,
  p_join_date date,
  p_join_description text,
  p_exit_date date,
  p_exit_description text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_employee_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  select employee_id into v_employee_id
  from public.employment_periods where id = p_period_id;
  if not found then
    raise exception 'Period not found.';
  end if;

  perform 1 from public.employees where id = v_employee_id for update;

  if p_exit_date is not null and p_exit_date < p_join_date then
    raise exception 'Exit date cannot be before the join date.';
  end if;

  if exists (
    select 1 from public.employment_periods o
    where o.employee_id = v_employee_id
      and o.id <> p_period_id
      and daterange(o.join_date, o.exit_date, '[]') && daterange(p_join_date, p_exit_date, '[]')
  ) then
    raise exception 'These dates overlap with another join/exit period of this employee.';
  end if;

  update public.employment_periods
  set join_date = p_join_date,
      join_description = nullif(btrim(p_join_description), ''),
      exit_date = p_exit_date,
      exit_description = case when p_exit_date is null then null
                              else nullif(btrim(p_exit_description), '') end
  where id = p_period_id;

  update public.employees
  set status = case
    when exists (
      select 1 from public.employment_periods
      where employee_id = v_employee_id and exit_date is null
    ) then 'ACTIVE' else 'EXITED' end
  where id = v_employee_id;
end;
$$;

-- Only logged-in users may call these (RLS / is_admin() does the rest).
revoke execute on function public.employees_active_on(date) from public, anon;
revoke execute on function public.attendance_summary(date, date, uuid[]) from public, anon;
revoke execute on function public.daily_attendance_counts(date, date) from public, anon;
revoke execute on function public.headcount_trend(integer, date) from public, anon;
revoke execute on function public.create_employee(text, text, text, text, numeric, date, text) from public, anon;
revoke execute on function public.exit_employee(uuid, date, text) from public, anon;
revoke execute on function public.rejoin_employee(uuid, date, text) from public, anon;
revoke execute on function public.update_employment_period(uuid, date, text, date, text) from public, anon;
revoke execute on function public.next_employee_code() from public, anon;

grant execute on function public.employees_active_on(date) to authenticated;
grant execute on function public.attendance_summary(date, date, uuid[]) to authenticated;
grant execute on function public.daily_attendance_counts(date, date) to authenticated;
grant execute on function public.headcount_trend(integer, date) to authenticated;
grant execute on function public.create_employee(text, text, text, text, numeric, date, text) to authenticated;
grant execute on function public.exit_employee(uuid, date, text) to authenticated;
grant execute on function public.rejoin_employee(uuid, date, text) to authenticated;
grant execute on function public.update_employment_period(uuid, date, text, date, text) to authenticated;
grant execute on function public.next_employee_code() to authenticated;
