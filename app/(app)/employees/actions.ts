"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { toErrorResult, type ActionResult } from "@/lib/action-result";
import { MAX_PHOTO_BYTES, PHOTO_BUCKET, PHOTO_TYPES } from "@/lib/constants";
import {
  employeeSchema,
  exitSchema,
  firstIssue,
  newEmployeeSchema,
  periodSchema,
  rejoinSchema,
} from "@/lib/validation";

type Supabase = Awaited<ReturnType<typeof assertAdmin>>["supabase"];

function fields(formData: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, formData.get(k) ?? undefined]));
}

function getPhoto(formData: FormData): File | null {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!PHOTO_TYPES.includes(file.type)) throw new Error("Photo must be a JPG, PNG or WEBP image.");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("Photo must be smaller than 5 MB.");
  return file;
}

async function uploadPhoto(supabase: Supabase, employeeId: string, file: File) {
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${employeeId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return path;
}

function refresh(employeeId?: string) {
  revalidatePath("/employees");
  if (employeeId) revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/attendance");
}

export async function createEmployee(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await assertAdmin();
    const parsed = newEmployeeSchema.safeParse(
      fields(formData, ["full_name", "phone", "address", "role", "join_date", "join_description"]),
    );
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
    const photo = getPhoto(formData);
    const v = parsed.data;

    const { data: id, error } = await supabase.rpc("create_employee", {
      p_full_name: v.full_name,
      p_phone: v.phone,
      p_address: v.address,
      p_role: v.role,
      p_daily_wage: 0, // wages are not used by the app
      p_join_date: v.join_date,
      p_join_description: v.join_description,
    });
    if (error) throw error;

    let message: string | undefined;
    if (photo) {
      try {
        const path = await uploadPhoto(supabase, id, photo);
        const { error: updError } = await supabase.from("employees").update({ photo_path: path }).eq("id", id);
        if (updError) throw updError;
      } catch (e) {
        message = `Employee added, but the photo was not saved: ${toErrorResult(e).error}`;
      }
    }

    refresh(id);
    return { ok: true, data: { id }, message };
  } catch (e) {
    return toErrorResult(e);
  }
}

export async function updateEmployee(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await assertAdmin();
    const idCheck = z.uuid().safeParse(formData.get("id"));
    if (!idCheck.success) return { ok: false, error: "Employee not found." };
    const id = idCheck.data;
    const parsed = employeeSchema.safeParse(fields(formData, ["full_name", "phone", "address", "role"]));
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
    const photo = getPhoto(formData);
    const removePhoto = formData.get("remove_photo") === "1";

    const { data: existing, error: fetchError } = await supabase
      .from("employees")
      .select("id, photo_path")
      .eq("id", id)
      .single();
    if (fetchError || !existing) return { ok: false, error: "Employee not found." };

    let photo_path = existing.photo_path;
    if (photo) photo_path = await uploadPhoto(supabase, id, photo);
    else if (removePhoto) photo_path = null;

    const v = parsed.data;
    const { error } = await supabase
      .from("employees")
      .update({
        full_name: v.full_name,
        phone: v.phone || null,
        address: v.address || null,
        role: v.role,
        photo_path,
      })
      .eq("id", id);
    if (error) throw error;

    if (existing.photo_path && existing.photo_path !== photo_path) {
      await supabase.storage.from(PHOTO_BUCKET).remove([existing.photo_path]);
    }

    refresh(id);
    return { ok: true };
  } catch (e) {
    return toErrorResult(e);
  }
}

export async function exitEmployee(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await assertAdmin();
    const parsed = exitSchema.safeParse(fields(formData, ["employee_id", "exit_date", "exit_description"]));
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
    const v = parsed.data;
    const { error } = await supabase.rpc("exit_employee", {
      p_employee_id: v.employee_id,
      p_exit_date: v.exit_date,
      p_exit_description: v.exit_description,
    });
    if (error) throw error;
    refresh(v.employee_id);
    return { ok: true };
  } catch (e) {
    return toErrorResult(e);
  }
}

export async function rejoinEmployee(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await assertAdmin();
    const parsed = rejoinSchema.safeParse(fields(formData, ["employee_id", "join_date", "join_description"]));
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
    const v = parsed.data;
    const { error } = await supabase.rpc("rejoin_employee", {
      p_employee_id: v.employee_id,
      p_join_date: v.join_date,
      p_join_description: v.join_description,
    });
    if (error) throw error;
    refresh(v.employee_id);
    return { ok: true };
  } catch (e) {
    return toErrorResult(e);
  }
}

export async function updatePeriod(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await assertAdmin();
    const parsed = periodSchema.safeParse(
      fields(formData, ["period_id", "employee_id", "join_date", "join_description", "exit_date", "exit_description"]),
    );
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
    const v = parsed.data;
    const { error } = await supabase.rpc("update_employment_period", {
      p_period_id: v.period_id,
      p_join_date: v.join_date,
      p_join_description: v.join_description,
      // SQL accepts NULL here (period still open); generated types only say string
      p_exit_date: (v.exit_date || null) as string,
      p_exit_description: v.exit_description,
    });
    if (error) throw error;
    refresh(v.employee_id);
    return { ok: true };
  } catch (e) {
    return toErrorResult(e);
  }
}
