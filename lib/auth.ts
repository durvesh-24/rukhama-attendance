import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

async function checkAdmin(): Promise<{ supabase: ServerClient; user: User | null; isAdmin: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };

  const { data, error } = await supabase.rpc("is_admin");
  return { supabase, user, isAdmin: !error && data === true };
}

/** For pages/layouts: redirects to /login unless the visitor is an admin. */
export async function requireAdmin() {
  const { supabase, user, isAdmin } = await checkAdmin();
  if (!user) redirect("/login");
  if (!isAdmin) redirect("/login?error=not_admin");
  return { supabase, user };
}

export class NotAdminError extends Error {
  constructor() {
    super("You must be logged in as an admin to do this.");
  }
}

/** For Server Actions and API routes: throws unless the caller is an admin. */
export async function assertAdmin() {
  const { supabase, user, isAdmin } = await checkAdmin();
  if (!user || !isAdmin) throw new NotAdminError();
  return { supabase, user };
}

export async function getAdminStatus() {
  const { user, isAdmin } = await checkAdmin();
  return { user, isAdmin };
}
