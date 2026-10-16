import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database.types";
import { addMonths, currentMonthIST, isIsoMonth, monthEnd, monthStart } from "@/lib/dates";

type Client = SupabaseClient<Database>;
const PAGE = 1000; // Supabase API returns at most 1000 rows per request

export type ReportFilters = {
  from: string; // YYYY-MM
  to: string; // YYYY-MM
  employeeIds: string[] | null; // null = all employees
};

export const MAX_REPORT_MONTHS = 12;

/** Reads ?from=YYYY-MM&to=YYYY-MM&emp=id,id from search params, with safe defaults. */
export function parseReportFilters(params: {
  from?: string | string[] | null;
  to?: string | string[] | null;
  emp?: string | string[] | null;
}): ReportFilters {
  const one = (v: string | string[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? undefined;
  const current = currentMonthIST();
  let from = isIsoMonth(one(params.from)) ? one(params.from)! : current;
  let to = isIsoMonth(one(params.to)) ? one(params.to)! : from;
  if (to < from) [from, to] = [to, from];
  // keep exports a sensible size
  if (addMonths(from, MAX_REPORT_MONTHS - 1) < to) to = addMonths(from, MAX_REPORT_MONTHS - 1);

  const uuid = /^[0-9a-f-]{36}$/i;
  const raw = one(params.emp);
  const ids = raw ? raw.split(",").filter((id) => uuid.test(id)) : [];
  return { from, to, employeeIds: ids.length ? ids : null };
}

export type AttendanceRow = Pick<Tables<"attendance">, "employee_id" | "date" | "shift" | "status" | "note">;
export type PeriodRow = Tables<"employment_periods">;
export type SummaryRow = Database["public"]["Functions"]["attendance_summary"]["Returns"][number];
export type LogEvent = {
  date: string;
  type: "JOINED" | "EXITED";
  employee_id: string;
  employee_code: string;
  full_name: string;
  description: string | null;
};

export async function getReportData(supabase: Client, filters: ReportFilters) {
  const start = monthStart(filters.from);
  const end = monthEnd(filters.to);

  const { data: summary, error: summaryError } = await supabase.rpc("attendance_summary", {
    p_start: start,
    p_end: end,
    ...(filters.employeeIds ? { p_employee_ids: filters.employeeIds } : {}),
  });
  if (summaryError) throw summaryError;

  const employeeIds = (summary ?? []).map((s) => s.employee_id);

  const [attendance, periods] = employeeIds.length
    ? await Promise.all([
        fetchAttendance(supabase, start, end, filters.employeeIds),
        fetchPeriods(supabase, employeeIds),
      ])
    : [[], []];

  const byId = new Map((summary ?? []).map((s) => [s.employee_id, s]));
  const log: LogEvent[] = [];
  for (const p of periods) {
    const emp = byId.get(p.employee_id);
    if (!emp) continue;
    if (p.join_date >= start && p.join_date <= end) {
      log.push({
        date: p.join_date,
        type: "JOINED",
        employee_id: p.employee_id,
        employee_code: emp.employee_code,
        full_name: emp.full_name,
        description: p.join_description,
      });
    }
    if (p.exit_date && p.exit_date >= start && p.exit_date <= end) {
      log.push({
        date: p.exit_date,
        type: "EXITED",
        employee_id: p.employee_id,
        employee_code: emp.employee_code,
        full_name: emp.full_name,
        description: p.exit_description,
      });
    }
  }
  log.sort((a, b) => a.date.localeCompare(b.date) || a.full_name.localeCompare(b.full_name));

  return { start, end, summary: summary ?? [], attendance, periods, log };
}

async function fetchAttendance(
  supabase: Client,
  start: string,
  end: string,
  employeeIds: string[] | null,
): Promise<AttendanceRow[]> {
  const rows: AttendanceRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from("attendance")
      .select("employee_id, date, shift, status, note")
      .gte("date", start)
      .lte("date", end)
      .order("date")
      .order("employee_id")
      .order("shift")
      .range(from, from + PAGE - 1);
    if (employeeIds) query = query.in("employee_id", employeeIds);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

async function fetchPeriods(supabase: Client, employeeIds: string[]): Promise<PeriodRow[]> {
  const rows: PeriodRow[] = [];
  // chunk ids so the request URL stays short
  for (let i = 0; i < employeeIds.length; i += 150) {
    const chunk = employeeIds.slice(i, i + 150);
    const { data, error } = await supabase
      .from("employment_periods")
      .select("*")
      .in("employee_id", chunk)
      .order("join_date");
    if (error) throw error;
    rows.push(...(data ?? []));
  }
  return rows;
}
