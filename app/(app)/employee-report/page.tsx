import type { Metadata } from "next";
import { CalendarX, Moon, Sun, Sunset, UserSearch } from "lucide-react";
import { EmployeeReportCharts, EmployeeReportFilters } from "@/components/employee-report";
import { AttendanceCalendar } from "@/components/employees/attendance-calendar";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { ATTENDANCE_META, NIGHT_META, SHIFT_META, type AttendanceStatus } from "@/lib/constants";
import { currentMonthIST, eachDay, eachMonth, formatDate, formatMonthLong, formatMonthShort, todayIST, weekdayShort } from "@/lib/dates";
import { fetchAllRows } from "@/lib/fetch-all";
import { getReportData, parseReportFilters } from "@/lib/report-data";
import { groupByDate, wasEmployedOn } from "@/lib/shift-days";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Employee report" };

function StatusCell({ status }: { status?: AttendanceStatus }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-block min-w-16 rounded px-2 py-0.5 text-center text-xs font-semibold", ATTENDANCE_META[status].className)}>
      {ATTENDANCE_META[status].label}
    </span>
  );
}

export default async function EmployeeReportPage({ searchParams }: PageProps<"/employee-report">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const parsed = parseReportFilters({ from: sp.from, to: sp.to, emp: sp.emp });
  const employeeId = parsed.employeeIds?.[0] ?? null;
  const filters = { ...parsed, employeeIds: employeeId ? [employeeId] : null };

  const employees = await fetchAllRows((from, to) =>
    supabase.from("employees").select("id, employee_code, full_name, role, status").order("full_name").range(from, to),
  );

  const header = <PageHeader title="Employee report" description="Shifts, night shifts and leaves for one employee." />;
  const filterBar = (
    <EmployeeReportFilters employees={employees} employeeId={employeeId} from={filters.from} to={filters.to} currentMonth={currentMonthIST()} />
  );

  if (!employeeId) {
    return (
      <>
        {header}
        {filterBar}
        <EmptyState icon={UserSearch} title="Choose an employee">
          Pick an employee above to see their attendance.
        </EmptyState>
      </>
    );
  }

  const data = await getReportData(supabase, filters);
  const s = data.summary[0];
  const emp = employees.find((e) => e.id === employeeId);
  const period =
    filters.from === filters.to ? formatMonthLong(filters.from) : `${formatMonthLong(filters.from)} – ${formatMonthLong(filters.to)}`;

  if (!s || !emp) {
    return (
      <>
        {header}
        {filterBar}
        <EmptyState icon={CalendarX} title="Nothing to show">
          {emp ? `${emp.full_name} was not working in ${period}.` : "Employee not found."}
        </EmptyState>
      </>
    );
  }

  const days = groupByDate(data.attendance);
  const periods = data.periods;
  const today = todayIST();
  const end = data.end < today ? data.end : today;
  const tableDays = eachDay(data.start, end)
    .filter((d) => days.has(d) || wasEmployedOn(periods, d))
    .reverse();
  const nightDates = [...days.entries()].filter(([, d]) => d.NIGHT).map(([date]) => date).sort();
  const leaveDates = [...days.entries()]
    .filter(([, d]) => d.MORNING === "LEAVE" || d.EVENING === "LEAVE")
    .map(([date, d]) => ({ date, full: d.MORNING === "LEAVE" && d.EVENING === "LEAVE", which: d.MORNING === "LEAVE" ? "S1" : "S2" }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // chart data: per day for one month, per month for a range
  const single = filters.from === filters.to;
  const buckets = single ? eachDay(data.start, data.end) : eachMonth(filters.from, filters.to);
  const chartData = buckets.map((b) => {
    const match = (date: string) => (single ? date === b : date.startsWith(b));
    let s1 = 0, s2 = 0, n = 0;
    for (const [date, d] of days) {
      if (!match(date)) continue;
      if (d.MORNING === "PRESENT") s1++;
      if (d.EVENING === "PRESENT") s2++;
      if (d.NIGHT) n++;
    }
    return { label: single ? b.slice(8, 10) : formatMonthShort(b), "Shift 1": s1, "Shift 2": s2, Night: n };
  });
  const pieData = [
    { name: "Present", value: s.shift1_present + s.shift2_present, color: ATTENDANCE_META.PRESENT.color },
    { name: "Absent", value: s.absent_shifts, color: ATTENDANCE_META.ABSENT.color },
    { name: "Leave", value: s.leave_shifts, color: ATTENDANCE_META.LEAVE.color },
    { name: "Night", value: s.night_shifts, color: NIGHT_META.color },
  ].filter((p) => p.value > 0);

  const stats = [
    { label: "Shift 1 present", value: s.shift1_present, icon: Sun, className: "text-emerald-600" },
    { label: "Shift 2 present", value: s.shift2_present, icon: Sunset, className: "text-sky-600" },
    { label: "Night shifts", value: s.night_shifts, icon: Moon, className: "text-indigo-600" },
    { label: "Days worked", value: s.days_worked },
    { label: "Leave", value: s.leave_shifts, hint: `${s.leave_days} day${s.leave_days === 1 ? "" : "s"}` },
    { label: "Absent (shifts)", value: s.absent_shifts },
  ];

  return (
    <>
      {header}
      {filterBar}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{s.full_name}</h2>
        <Badge variant="secondary">{s.employee_code}</Badge>
        <Badge variant="outline">{s.role}</Badge>
        {s.status === "EXITED" && <Badge variant="secondary">Exited</Badge>}
        <span className="text-sm text-muted-foreground">· {period}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map(({ label, value, icon: Icon, className, hint }) => (
          <Card key={label} className="gap-1 py-4">
            <CardContent className="px-4">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                {label}
                {Icon && <Icon className={`size-4 ${className}`} />}
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
              {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <EmployeeReportCharts bars={chartData} pie={pieData} byMonth={!single} />

        {single && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
              <CardDescription>{period}</CardDescription>
            </CardHeader>
            <CardContent>
              <AttendanceCalendar month={filters.from} attendance={data.attendance} periods={periods} />
            </CardContent>
          </Card>
        )}

        <Card className={single ? "" : "lg:col-span-3"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="size-4 text-indigo-600" /> Night shift dates
            </CardTitle>
            <CardDescription>{nightDates.length} night shift{nightDates.length === 1 ? "" : "s"} · {SHIFT_META.NIGHT.time}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {nightDates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No night shifts in this period.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {nightDates.map((d) => (
                  <span key={d} className={cn("rounded-md px-2 py-1 text-xs font-medium", NIGHT_META.className)}>
                    {formatDate(d)} {weekdayShort(d)}
                  </span>
                ))}
              </div>
            )}
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <CalendarX className="size-4 text-amber-600" /> Leave dates
                <span className="font-normal text-muted-foreground">
                  ({s.leave_days} day{s.leave_days === 1 ? "" : "s"})
                </span>
              </p>
              {leaveDates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leave in this period.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {leaveDates.map((l) => (
                    <span key={l.date} className={cn("rounded-md px-2 py-1 text-xs font-medium", ATTENDANCE_META.LEAVE.className)}>
                      {formatDate(l.date)} · {l.full ? "Full day" : `Half (${l.which})`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Day by day</CardTitle>
          <CardDescription>Newest first. Same as the &quot;Daily&quot; sheet in the Excel download.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {tableDays.length === 0 ? (
            <p className="px-4 text-sm text-muted-foreground">No days to show.</p>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="pl-4 sm:pl-2">Date</TableHead>
                    <TableHead className="text-center">Shift 1</TableHead>
                    <TableHead className="text-center">Shift 2</TableHead>
                    <TableHead className="text-center">Night</TableHead>
                    <TableHead className="pr-4 sm:pr-2">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableDays.map((d) => {
                    const rec = days.get(d);
                    return (
                      <TableRow key={d}>
                        <TableCell className="pl-4 whitespace-nowrap sm:pl-2">
                          {formatDate(d)} <span className="text-xs text-muted-foreground">{weekdayShort(d)}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusCell status={rec?.MORNING} />
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusCell status={rec?.EVENING} />
                        </TableCell>
                        <TableCell className="text-center">
                          {rec?.NIGHT ? (
                            <span className={cn("inline-block rounded px-2 py-0.5 text-xs font-semibold", NIGHT_META.className)}>Worked</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-64 pr-4 text-xs whitespace-normal text-muted-foreground sm:pr-2">
                          {(rec?.notes ?? []).map((n) => `${SHIFT_META[n.shift].short}: ${n.note}`).join(" · ")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
