import type { Metadata } from "next";
import { AttendanceMarker } from "@/components/attendance-marker";
import { requireAdmin } from "@/lib/auth";
import { SHIFTS, type Shift } from "@/lib/constants";
import { currentShiftIST, isIsoDate, todayIST } from "@/lib/dates";
import { fetchAllRows } from "@/lib/fetch-all";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage({ searchParams }: PageProps<"/attendance">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const today = todayIST();
  const raw = Array.isArray(sp.date) ? sp.date[0] : sp.date;
  const date = isIsoDate(raw) && raw <= today ? raw : today;
  const rawShift = Array.isArray(sp.shift) ? sp.shift[0] : sp.shift;
  const shift: Shift = SHIFTS.includes(rawShift as Shift)
    ? (rawShift as Shift)
    : date === today
      ? currentShiftIST()
      : "MORNING";

  const [employees, marks] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .rpc("employees_active_on", { p_date: date })
        .select("id, employee_code, full_name, role")
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("attendance")
        .select("employee_id, shift, status, note")
        .eq("date", date)
        .range(from, to),
    ),
  ]);

  return (
    <AttendanceMarker
      key={date}
      date={date}
      today={today}
      initialShift={shift}
      employees={employees}
      existing={marks}
    />
  );
}
