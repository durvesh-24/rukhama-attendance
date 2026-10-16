"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SHIFT_META } from "@/lib/constants";
import { addMonths, formatMonthLong } from "@/lib/dates";
import { cn } from "@/lib/utils";

const MAX_MONTHS = 12;
type Employee = { id: string; employee_code: string; full_name: string; role: string; status: string };

export function EmployeeReportFilters({
  employees,
  employeeId,
  from,
  to,
  currentMonth,
}: {
  employees: Employee[];
  employeeId: string | null;
  from: string;
  to: string;
  currentMonth: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"single" | "range">(from === to ? "single" : "range");
  const [query, setQuery] = useState("");
  const months = useMemo(() => Array.from({ length: 60 }, (_, i) => addMonths(currentMonth, -i)), [currentMonth]);

  const go = (next: { emp?: string | null; from?: string; to?: string }) => {
    const e = next.emp === undefined ? employeeId : next.emp;
    const f = next.from ?? from;
    let t = next.to ?? (mode === "single" ? f : to);
    if (t < f || t > addMonths(f, MAX_MONTHS - 1)) t = f;
    const params = new URLSearchParams({ from: f, to: t });
    if (e) params.set("emp", e);
    router.push(`/employee-report?${params.toString()}`);
  };

  const q = query.trim().toLowerCase();
  const matches = employees.filter(
    (e) => !q || e.full_name.toLowerCase().includes(q) || e.employee_code.toLowerCase().includes(q) || e.id === employeeId,
  );
  const active = matches.filter((e) => e.status === "ACTIVE");
  const exited = matches.filter((e) => e.status !== "ACTIVE");

  return (
    <Card className="mb-4">
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
          <div className="grid gap-2">
            <Label>Employee</Label>
            <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter list" className="h-10 pl-9" />
              </div>
              <Select value={employeeId ?? ""} onValueChange={(v) => go({ emp: v })}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {active.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Active</SelectLabel>
                      {active.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.full_name} · {e.employee_code}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {exited.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Exited</SelectLabel>
                      {exited.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.full_name} · {e.employee_code}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {matches.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">No match</p>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Period</Label>
            <div className="inline-flex w-fit rounded-lg bg-muted p-1 text-sm">
              {(["single", "range"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    if (m === "single" && from !== to) go({ to: from });
                  }}
                  className={cn(
                    "rounded-md px-3 py-1.5 font-medium text-muted-foreground",
                    mode === m && "bg-background text-foreground shadow-sm",
                  )}
                >
                  {m === "single" ? "One month" : "Month range"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label>{mode === "single" ? "Month" : "From"}</Label>
            <Select value={from} onValueChange={(v) => go({ from: v, to: mode === "single" ? v : undefined })}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {months.map((m) => (
                  <SelectItem key={m} value={m}>
                    {formatMonthLong(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {mode === "range" && (
            <div className="grid gap-2">
              <Label>To (max {MAX_MONTHS} months)</Label>
              <Select value={to} onValueChange={(v) => go({ to: v })}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {months
                    .filter((m) => m >= from && m <= addMonths(from, MAX_MONTHS - 1))
                    .map((m) => (
                      <SelectItem key={m} value={m}>
                        {formatMonthLong(m)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-end">
            <Button asChild={!!employeeId} disabled={!employeeId} className="h-10 w-full">
              {employeeId ? (
                <a href={`/api/export/employee?emp=${employeeId}&from=${from}&to=${to}`} download>
                  <Download /> Download Excel
                </a>
              ) : (
                <span className="flex items-center gap-2">
                  <Download /> Download Excel
                </span>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};
const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };

type BarPoint = { label: string; "Shift 1": number; "Shift 2": number; Night: number };
type PiePoint = { name: string; value: number; color: string };

export function EmployeeReportCharts({ bars, pie, byMonth }: { bars: BarPoint[]; pie: PiePoint[]; byMonth: boolean }) {
  const hasData = pie.length > 0;
  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Shifts worked</CardTitle>
          <CardDescription>{byMonth ? "Per month" : "Per day"}</CardDescription>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bars} margin={{ left: -20, right: 4, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Shift 1" stackId={byMonth ? undefined : "a"} fill={SHIFT_META.MORNING.color} />
                  <Bar dataKey="Shift 2" stackId={byMonth ? undefined : "a"} fill={SHIFT_META.EVENING.color} />
                  <Bar dataKey="Night" stackId={byMonth ? undefined : "a"} fill={SHIFT_META.NIGHT.color} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <NoData />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Breakdown</CardTitle>
          <CardDescription>All shifts in this period</CardDescription>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius="50%" outerRadius="80%" paddingAngle={2}>
                    {pie.map((d) => (
                      <Cell key={d.name} fill={d.color} stroke="var(--background)" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <NoData />
          )}
        </CardContent>
      </Card>
    </>
  );
}

function NoData() {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      No attendance marked in this period
    </div>
  );
}
