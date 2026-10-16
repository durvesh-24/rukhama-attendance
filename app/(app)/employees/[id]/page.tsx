import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, MapPin, Phone } from "lucide-react";
import { AttendanceCalendar } from "@/components/employees/attendance-calendar";
import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import { StatusBadge } from "@/components/employees/employee-list";
import { ProfileActions, PeriodTimeline } from "@/components/employees/profile-actions";
import { MonthPicker } from "@/components/month-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { ATTENDANCE_META, NIGHT_META, PHOTO_BUCKET } from "@/lib/constants";
import { currentMonthIST, formatMonthLong, isIsoMonth, monthEnd, monthStart } from "@/lib/dates";

export const metadata: Metadata = { title: "Employee" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EmployeeProfilePage({ params, searchParams }: PageProps<"/employees/[id]">) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();

  const rawMonth = Array.isArray(sp.month) ? sp.month[0] : sp.month;
  const month = isIsoMonth(rawMonth) ? rawMonth : currentMonthIST();
  const start = monthStart(month);
  const end = monthEnd(month);

  const [{ data: employee }, periodsRes, attendanceRes, summaryRes] = await Promise.all([
    supabase.from("employees").select("*").eq("id", id).maybeSingle(),
    supabase.from("employment_periods").select("*").eq("employee_id", id).order("join_date", { ascending: false }),
    supabase
      .from("attendance")
      .select("date, shift, status, note")
      .eq("employee_id", id)
      .gte("date", start)
      .lte("date", end),
    supabase.rpc("attendance_summary", { p_start: start, p_end: end, p_employee_ids: [id] }),
  ]);
  if (!employee) notFound();
  const err = periodsRes.error ?? attendanceRes.error ?? summaryRes.error;
  if (err) throw new Error(err.message);

  const periods = periodsRes.data ?? [];
  const attendance = attendanceRes.data ?? [];
  const summary = summaryRes.data?.[0];
  const tiles = [
    { label: "Shift 1 present", value: summary?.shift1_present ?? 0, className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    { label: "Shift 2 present", value: summary?.shift2_present ?? 0, className: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
    { label: "Night shifts", value: summary?.night_shifts ?? 0, className: NIGHT_META.className },
    { label: "Leave (shifts)", value: summary?.leave_shifts ?? 0, className: ATTENDANCE_META.LEAVE.className },
    { label: "Absent (shifts)", value: summary?.absent_shifts ?? 0, className: ATTENDANCE_META.ABSENT.className },
  ];

  let photoUrl: string | null = null;
  if (employee.photo_path) {
    const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(employee.photo_path, 60 * 60);
    photoUrl = data?.signedUrl ?? null;
  }

  const current = periods.find((p) => !p.exit_date) ?? null;
  const latest = periods[0] ?? null;

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
        <Link href="/employees">
          <ArrowLeft /> Employees
        </Link>
      </Button>

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <EmployeeAvatar name={employee.full_name} url={photoUrl} className="size-20" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{employee.full_name}</h1>
              <StatusBadge status={employee.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {employee.employee_code} · {employee.role}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {employee.phone && (
                <a href={`tel:${employee.phone}`} className="flex items-center gap-1 hover:text-foreground">
                  <Phone className="size-3.5" /> {employee.phone}
                </a>
              )}
              {employee.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" /> {employee.address}
                </span>
              )}
            </div>
          </div>
        </div>
        <ProfileActions
          employee={{
            id: employee.id,
            employee_code: employee.employee_code,
            full_name: employee.full_name,
            phone: employee.phone,
            address: employee.address,
            role: employee.role,
            status: employee.status,
            has_photo: !!employee.photo_path,
            photo_url: photoUrl,
            join_date: current?.join_date ?? latest?.join_date ?? null,
            exit_date: employee.status === "EXITED" ? (latest?.exit_date ?? null) : null,
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Attendance · {formatMonthLong(month)}</CardTitle>
            <MonthPicker month={month} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {tiles.map((t) => (
                <div key={t.label} className={`rounded-lg px-3 py-2 ${t.className}`}>
                  <p className="text-xs font-medium">{t.label}</p>
                  <p className="text-xl font-semibold tabular-nums">{t.value}</p>
                </div>
              ))}
              <div className="rounded-lg bg-primary px-3 py-2 text-primary-foreground">
                <p className="text-xs font-medium opacity-80">Days worked</p>
                <p className="text-xl font-semibold tabular-nums">{summary?.days_worked ?? 0}</p>
              </div>
            </div>
            <AttendanceCalendar month={month} attendance={attendance} periods={periods} />
            <Button variant="outline" size="sm" asChild className="w-fit">
              <Link href={`/employee-report?emp=${employee.id}&from=${month}&to=${month}`}>
                <BarChart3 /> Full report &amp; Excel
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join / exit history</CardTitle>
          </CardHeader>
          <CardContent>
            <PeriodTimeline periods={periods} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
