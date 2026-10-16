"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { toErrorResult, type ActionResult } from "@/lib/action-result";
import type { Shift } from "@/lib/constants";
import { todayIST } from "@/lib/dates";
import { fetchAllRows } from "@/lib/fetch-all";
import { attendanceBatchSchema, firstIssue } from "@/lib/validation";

export type AttendanceBatch = {
  date: string;
  entries: { employee_id: string; shift: Shift; status: string; note: string }[];
  /** shift marks to remove for this date */
  clear: { employee_id: string; shift: Shift }[];
};

export async function saveAttendance(input: AttendanceBatch): Promise<ActionResult<{ saved: number }>> {
  try {
    const { supabase } = await assertAdmin();
    const parsed = attendanceBatchSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
    const { date, entries, clear } = parsed.data;
    if (date > todayIST()) return { ok: false, error: "Attendance cannot be marked for a future date." };

    // only employees who were working on that date can be marked
    const active = await fetchAllRows((from, to) =>
      supabase.rpc("employees_active_on", { p_date: date }).select("id").range(from, to),
    );
    const activeIds = new Set(active.map((e) => e.id));
    const invalid = new Set(entries.filter((e) => !activeIds.has(e.employee_id)).map((e) => e.employee_id));
    if (invalid.size) {
      return { ok: false, error: `${invalid.size} employee(s) were not working on this date. Refresh and try again.` };
    }

    const now = new Date().toISOString();
    const rows = entries.map((e) => ({
      employee_id: e.employee_id,
      date,
      shift: e.shift,
      status: e.status,
      note: e.note || null,
      marked_at: now,
    }));

    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase
        .from("attendance")
        .upsert(rows.slice(i, i + 500), { onConflict: "employee_id,date,shift" });
      if (error) throw error;
    }

    // group removals by shift so each delete is one request
    for (const shift of ["MORNING", "EVENING", "NIGHT"] as const) {
      const ids = clear.filter((c) => c.shift === shift).map((c) => c.employee_id);
      for (let i = 0; i < ids.length; i += 200) {
        const { error } = await supabase
          .from("attendance")
          .delete()
          .eq("date", date)
          .eq("shift", shift)
          .in("employee_id", ids.slice(i, i + 200));
        if (error) throw error;
      }
    }

    revalidatePath("/attendance");
    revalidatePath("/dashboard");
    return { ok: true, data: { saved: rows.length } };
  } catch (e) {
    return toErrorResult(e);
  }
}
