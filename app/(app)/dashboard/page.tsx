import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Moon, Sun, Sunset, UserMinus, UserPlus, Users } from "lucide-react";
import { DailyBarChart, HeadcountLineChart, TodayPieChart } from "@/components/dashboard-charts";
import { MonthPicker } from "@/components/month-picker";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { ATTENDANCE_META, ATTENDANCE_STATUSES, SHIFT_META } from "@/lib/constants";
import {
  currentMonthIST,
  formatDate,
  formatMonthLong,
  formatMonthShort,
  isIsoMonth,
  monthEnd,
  monthStart,
  todayIST,
} from "@/lib/dates";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const today = todayIST();
  const thisMonth = currentMonthIST();
  const rawMonth = Array.isArray(params.month) ? params.month[0] : params.month;
  const month = isIsoMonth(rawMonth) && rawMonth <= thisMonth ? rawMonth : thisMonth;
  const chartEnd = month === thisMonth ? today : monthEnd(month);

  const [activeTotal, activeToday, todayAttendance, joined, exited, daily, trend] = await Promise.all([
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase.rpc("employees_active_on", { p_date: today }).select("id"),
    supabase.from("attendance").select("shift, status").eq("date", today),
    supabase
      .from("employment_periods")
      .select("id", { count: "exact", head: true })
      .gte("join_date", monthStart(thisMonth))
      .lte("join_date", monthEnd(thisMonth)),
    supabase
      .from("employment_periods")
      .select("id", { count: "exact", head: true })
      .gte("exit_date", monthStart(thisMonth))
      .lte("exit_date", monthEnd(thisMonth)),
    supabase.rpc("daily_attendance_counts", { p_start: monthStart(month), p_end: chartEnd }),
    supabase.rpc("headcount_trend", { p_months: 12, p_until: today }),
  ]);

  const firstError = [activeTotal, activeToday, todayAttendance, joined, exited, daily, trend].find((r) => r.error)?.error;
  if (firstError) throw new Error(firstError.message);

  const rows = todayAttendance.data ?? [];
  const count = (shift: string, status?: string) =>
    rows.filter((r) => r.shift === shift && (!status || r.status === status)).length;
  const activeTodayCount = activeToday.data?.length ?? 0;

  const s1 = { P: count("MORNING", "PRESENT"), marked: count("MORNING") };
  const s2 = { P: count("EVENING", "PRESENT"), marked: count("EVENING") };
  const night = count("NIGHT");
  const notMarked = Math.max(activeTodayCount - s1.marked, 0) + Math.max(activeTodayCount - s2.marked, 0);

  const dayRows = rows.filter((r) => r.shift !== "NIGHT");
  const pieData = [
    ...ATTENDANCE_STATUSES.map((s) => ({
      name: ATTENDANCE_META[s].label,
      value: dayRows.filter((r) => r.status === s).length,
      color: ATTENDANCE_META[s].color,
    })),
    { name: "Not marked", value: notMarked, color: "#a3a3a3" },
  ].filter((d) => d.value > 0);

  const dailyData = (daily.data ?? []).map((d) => ({
    day: d.day.slice(8, 10),
    date: formatDate(d.day),
    "Shift 1": d.shift1_present,
    "Shift 2": d.shift2_present,
    Night: d.night,
  }));

  const trendData = (trend.data ?? []).map((t) => ({
    month: formatMonthShort(t.month.slice(0, 7)),
    Headcount: t.headcount,
    Joined: t.joined,
    Exited: t.exited,
  }));

  const stats = [
    { label: "Total active", value: activeTotal.count ?? 0, icon: Users, tone: "text-primary" },
    {
      label: "Shift 1 present",
      value: s1.P,
      icon: Sun,
      tone: "text-emerald-600",
      hint: `${SHIFT_META.MORNING.time} · ${s1.marked}/${activeTodayCount} marked`,
    },
    {
      label: "Shift 2 present",
      value: s2.P,
      icon: Sunset,
      tone: "text-sky-600",
      hint: `${SHIFT_META.EVENING.time} · ${s2.marked}/${activeTodayCount} marked`,
    },
    { label: "Night shift today", value: night, icon: Moon, tone: "text-indigo-600", hint: SHIFT_META.NIGHT.time },
    { label: "Joined this month", value: joined.count ?? 0, icon: UserPlus, tone: "text-sky-600" },
    { label: "Exited this month", value: exited.count ?? 0, icon: UserMinus, tone: "text-amber-600" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description={`Today is ${formatDate(today)}`}>
        <Button asChild>
          <Link href="/attendance">
            <CalendarCheck /> Mark attendance
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map(({ label, value, icon: Icon, tone, hint }) => (
          <Card key={label} className="gap-1 py-4">
            <CardContent className="px-4">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                {label}
                <Icon className={`size-4 ${tone}`} />
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
              {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {notMarked > 0 && (
        <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          {notMarked} day-shift mark{notMarked > 1 ? "s are" : " is"} still missing for today ({activeTodayCount} employees ×
          2 shifts).{" "}
          <Link href="/attendance" className="font-medium underline underline-offset-2">
            Mark now
          </Link>
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Present per shift</CardTitle>
              <CardDescription>{formatMonthLong(month)}</CardDescription>
            </div>
            <MonthPicker month={month} max={thisMonth} />
          </CardHeader>
          <CardContent>
            <DailyBarChart data={dailyData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today (Shift 1 + Shift 2)</CardTitle>
            <CardDescription>{activeTodayCount} employees working today</CardDescription>
          </CardHeader>
          <CardContent>
            <TodayPieChart data={pieData} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Headcount trend</CardTitle>
            <CardDescription>Employees working each month, with joins and exits (last 12 months)</CardDescription>
          </CardHeader>
          <CardContent>
            <HeadcountLineChart data={trendData} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
