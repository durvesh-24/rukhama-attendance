import { z } from "zod";
import { ATTENDANCE_STATUSES, ROLES, SHIFTS } from "@/lib/constants";
import { isIsoDate } from "@/lib/dates";

const isoDate = z.string().refine(isIsoDate, "Enter a valid date");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .default("");

export const employeeSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(120),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+\-\s()]*$/, "Phone can only contain digits, spaces, + and -")
    .optional()
    .default(""),
  address: optionalText(300),
  role: z.enum(ROLES),
});

export const newEmployeeSchema = employeeSchema.extend({
  join_date: isoDate,
  join_description: optionalText(500),
});

export const exitSchema = z.object({
  employee_id: z.uuid(),
  exit_date: isoDate,
  exit_description: optionalText(500),
});

export const rejoinSchema = z.object({
  employee_id: z.uuid(),
  join_date: isoDate,
  join_description: optionalText(500),
});

export const periodSchema = z
  .object({
    period_id: z.uuid(),
    employee_id: z.uuid(),
    join_date: isoDate,
    join_description: optionalText(500),
    exit_date: z.union([isoDate, z.literal("")]).optional().default(""),
    exit_description: optionalText(500),
  })
  .refine((v) => !v.exit_date || v.exit_date >= v.join_date, {
    message: "Exit date cannot be before the join date",
    path: ["exit_date"],
  });

export const attendanceBatchSchema = z.object({
  date: isoDate,
  entries: z
    .array(
      z
        .object({
          employee_id: z.uuid(),
          shift: z.enum(SHIFTS),
          status: z.enum(ATTENDANCE_STATUSES),
          note: z.string().trim().max(300).optional().default(""),
        })
        .refine((e) => e.shift !== "NIGHT" || e.status === "PRESENT", {
          message: "A night shift can only be marked as worked",
        }),
    )
    .max(6000),
  clear: z
    .array(z.object({ employee_id: z.uuid(), shift: z.enum(SHIFTS) }))
    .max(6000)
    .default([]),
});

export const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}
