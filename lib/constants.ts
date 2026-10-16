export const APP_NAME = "Rukhama Tent House Attendance";
export const APP_SHORT_NAME = "Rukhama Attendance";

export const ROLES = ["Labour", "Driver", "Decorator", "Supervisor", "Other"] as const;
export type Role = (typeof ROLES)[number];

export const EMPLOYEE_STATUSES = ["ACTIVE", "EXITED"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

// ---------- shifts ----------
export const SHIFTS = ["MORNING", "EVENING", "NIGHT"] as const;
export type Shift = (typeof SHIFTS)[number];
export const DAY_SHIFTS = ["MORNING", "EVENING"] as const satisfies readonly Shift[];

export const SHIFT_META: Record<Shift, { label: string; short: string; time: string; color: string }> = {
  MORNING: { label: "Shift 1", short: "S1", time: "8:00 AM – 1:00 PM", color: "#10b981" },
  EVENING: { label: "Shift 2", short: "S2", time: "3:00 PM – 8:00 PM", color: "#0ea5e9" },
  NIGHT: { label: "Night shift", short: "N", time: "9:00 PM onwards", color: "#6366f1" },
};

// ---------- attendance status (per shift) ----------
export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LEAVE"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_META: Record<
  AttendanceStatus,
  { short: string; label: string; className: string; activeClassName: string; color: string; excelFill: string }
> = {
  PRESENT: {
    short: "P",
    label: "Present",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    activeClassName: "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-600",
    color: "#10b981",
    excelFill: "FFC6EFCE",
  },
  ABSENT: {
    short: "A",
    label: "Absent",
    className: "bg-red-500/15 text-red-700 dark:text-red-300",
    activeClassName: "bg-red-600 text-white border-red-600 hover:bg-red-600",
    color: "#ef4444",
    excelFill: "FFFFC7CE",
  },
  LEAVE: {
    short: "L",
    label: "Leave",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    activeClassName: "bg-amber-500 text-white border-amber-500 hover:bg-amber-500",
    color: "#f59e0b",
    excelFill: "FFFFEB9C",
  },
};

export const NIGHT_META = {
  short: "N",
  label: "Night shift",
  className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  activeClassName: "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-600",
  color: "#6366f1",
  excelFill: "FFD9D2F7",
};

export const PHOTO_BUCKET = "employee-photos";
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
