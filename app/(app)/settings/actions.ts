"use server";

import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { assertAdmin } from "@/lib/auth";
import { toErrorResult, type ActionResult } from "@/lib/action-result";
import { firstIssue, passwordSchema } from "@/lib/validation";

export async function changePassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await assertAdmin();
    const parsed = passwordSchema.safeParse({
      current: formData.get("current"),
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
    if (!user.email) return { ok: false, error: "This account has no email address." };

    // Re-check the current password with a throwaway client, so an unlocked
    // phone with an open session cannot be used to take over the account.
    const verifier = createStatelessClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error: verifyError } = await verifier.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.current,
    });
    if (verifyError) return { ok: false, error: "Current password is wrong." };
    await verifier.auth.signOut({ scope: "local" });

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, message: "Password changed." };
  } catch (e) {
    return toErrorResult(e);
  }
}
