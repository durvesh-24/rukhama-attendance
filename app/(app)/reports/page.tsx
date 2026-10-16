import type { Metadata } from "next";
import Link from "next/link";
import { FileSpreadsheet, LogIn, LogOut } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { ReportFilters } from "@/components/report-filters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { currentMonthIST, formatDate, formatMonthLong } from "@/lib/dates";
import { fetchAllRows } from "@/lib/fetch-all";
import { getReportData, parseReportFilters } from "@/lib/report-data";

export const metadata: Metadata = { title: "Reports" };

const COLUMNS = [
  { key: "shift1_present", label: "S1", title: "Shift 1 present" },
  { key: "shift2_present", label: "S2", title: "Shift 2 present" },
  { key: "night_shifts", label: "Night", title: "Night shifts" },
  { key: "days_worked", label: "Days", title: "Days worked" },
  { key: "leave_shifts", label: "Leave", title: "Leave (shifts)" },
  { key: "absent_shifts", label: "Absent", title: "Absent (shifts)" },
] as const;

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const filters = parseReportFilters({ from: sp.from, to: sp.to, emp: sp.emp });

  const [data, employees] = await Promise.all([
    getReportData(supabase, filters),
    fetchAllRows((from, to) =>
      supabase.from("employees").select("id, employee_code, full_name, status").order("full_name").range(from, to),
    ),
  ]);

  const totals = Object.fromEntries(
    COLUMNS.map((c) => [c.key, data.summary.reduce((t, s) => t + s[c.key], 0)]),
  ) as Record<(typeof COLUMNS)[number]["key"], number>;

  const period =
    filters.from === filters.to
      ? formatMonthLong(filters.from)
      : `${formatMonthLong(filters.from)} – ${formatMonthLong(filters.to)}`;

  const exportParams = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.employeeIds) exportParams.set("emp", filters.employeeIds.join(","));

  return (
    <>
      <PageHeader title="Reports" description="All employees: preview attendance and download it as an Excel file." />

      <ReportFilters
        filters={filters}
        currentMonth={currentMonthIST()}
        employees={employees}
        downloadHref={`/api/export?${exportParams.toString()}`}
        hasData={data.summary.length > 0}
      />

      {data.summary.length === 0 ? (
        <EmptyState icon={FileSpreadsheet} title="No data for this selection">
          No employees were working in {period}.
        </EmptyState>
      ) : (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary · {period}</CardTitle>
              <CardDescription>
                {data.summary.length} employee{data.summary.length > 1 ? "s" : ""} · {totals.night_shifts} night shifts ·{" "}
                {totals.leave_shifts} leave shifts. Tap a name for the full employee report.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4 sm:pl-2">Employee</TableHead>
                      {COLUMNS.map((c) => (
                        <TableHead key={c.key} className="text-right last:pr-4 sm:last:pr-2" title={c.title}>
                          {c.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.summary.map((s) => (
                      <TableRow key={s.employee_id}>
                        <TableCell className="pl-4 sm:pl-2">
                          <Link
                            href={`/employee-report?emp=${s.employee_id}&from=${filters.from}&to=${filters.to}`}
                            className="block font-medium hover:underline"
                          >
                            {s.full_name}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {s.employee_code} · {s.role}
                            {s.status === "EXITED" && " · Exited"}
                          </span>
                        </TableCell>
                        {COLUMNS.map((c) => (
                          <TableCell key={c.key} className="text-right tabular-nums last:pr-4 sm:last:pr-2">
                            {s[c.key]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="pl-4 font-semibold sm:pl-2">Total</TableCell>
                      {COLUMNS.map((c) => (
                        <TableCell key={c.key} className="text-right font-semibold tabular-nums last:pr-4 sm:last:pr-2">
                          {totals[c.key]}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
              <p className="mt-3 px-4 text-xs text-muted-foreground sm:px-0">
                S1 = Shift 1 (8 AM–1 PM) · S2 = Shift 2 (3 PM–8 PM) · Night = 9 PM onwards · Days = dates with any shift
                present
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Join / exit log</CardTitle>
              <CardDescription>{data.log.length} event{data.log.length === 1 ? "" : "s"} in {period}</CardDescription>
            </CardHeader>
            <CardContent>
              {data.log.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nobody joined or left in this period.</p>
              ) : (
                <ul className="divide-y">
                  {data.log.map((e, i) => (
                    <li key={`${e.employee_id}-${e.type}-${e.date}-${i}`} className="flex gap-3 py-2.5">
                      {e.type === "JOINED" ? (
                        <LogIn className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      ) : (
                        <LogOut className="mt-0.5 size-4 shrink-0 text-amber-600" />
                      )}
                      <div className="min-w-0 text-sm">
                        <p>
                          <span className="font-medium">{e.full_name}</span>{" "}
                          <span className="text-muted-foreground">
                            {e.type === "JOINED" ? "joined" : "exited"} on {formatDate(e.date)}
                          </span>
                        </p>
                        {e.description && <p className="text-muted-foreground">{e.description}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
