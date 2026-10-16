import type { AttendanceStatus, Shift } from "@/lib/constants";

export type ShiftRecord = { date: string; shift: string; status: string; note: string | null };

export type DayShifts = {
  MORNING?: AttendanceStatus;
  EVENING?: AttendanceStatus;
  NIGHT?: boolean;
  notes: { shift: Shift; note: string }[];
};

/** Groups shift rows into one entry per date. */
export function groupByDate(rows: ShiftRecord[]): Map<string, DayShifts> {
  const map = new Map<string, DayShifts>();
  for (const r of rows) {
    const day = map.get(r.date) ?? { notes: [] };
    if (r.shift === "NIGHT") day.NIGHT = r.status === "PRESENT";
    else day[r.shift as "MORNING" | "EVENING"] = r.status as AttendanceStatus;
    if (r.note) day.notes.push({ shift: r.shift as Shift, note: r.note });
    map.set(r.date, day);
  }
  return map;
}

export function wasEmployedOn(periods: { join_date: string; exit_date: string | null }[], date: string) {
  return periods.some((p) => p.join_date <= date && (!p.exit_date || p.exit_date >= date));
}
