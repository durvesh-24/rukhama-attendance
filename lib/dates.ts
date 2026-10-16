// All dates in the app are plain "YYYY-MM-DD" strings (Postgres `date`),
// months are "YYYY-MM". "Today" is always computed in Asia/Kolkata.

export const TIME_ZONE = "Asia/Kolkata";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;

export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Which shift is running now in IST: before 2 PM = Shift 1, before 8:30 PM = Shift 2, else Night. */
export function currentShiftIST(): "MORNING" | "EVENING" | "NIGHT" {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const minutes = h * 60 + m;
  if (minutes < 14 * 60) return "MORNING";
  if (minutes < 20 * 60 + 30) return "EVENING";
  return "NIGHT";
}

export function currentMonthIST(): string {
  return todayIST().slice(0, 7);
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function isIsoMonth(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_MONTH.test(value)) return false;
  const m = Number(value.slice(5, 7));
  return m >= 1 && m <= 12;
}

/** "2026-10-16" -> "16-10-2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${m}-${y}`;
}

/** Timestamp -> "16-10-2026 14:05" in IST */
export function formatDateTime(ts: string | null | undefined): string {
  if (!ts) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ts));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")}`;
}

/** "2026-10" -> "October 2026" */
export function formatMonthLong(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** "2026-10" -> "Oct-2026" */
export function formatMonthShort(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]}-${y}`;
}

export function monthStart(month: string): string {
  return `${month}-01`;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthEnd(month: string): string {
  return `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Inclusive list of days between two ISO dates. */
export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Inclusive list of months between two "YYYY-MM" values. */
export function eachMonth(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m);
  return out;
}

/** 0 = Sunday */
export function weekday(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS_SHORT[weekday(iso)];
}

export { MONTHS_SHORT, MONTHS_LONG, WEEKDAYS_SHORT };
