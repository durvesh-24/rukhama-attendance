/**
 * Promote an existing Supabase Auth user to admin.
 *
 *   npm run make-admin -- owner@example.com "Owner Name"
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * Runs only on your computer; the service role key is never sent to the browser.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const [email, ...nameParts] = process.argv.slice(2);
  if (!email || !email.includes("@")) {
    console.error('Usage: npm run make-admin -- <email> ["Display name"]');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // find the auth user by email (paged)
  const target = email.trim().toLowerCase();
  let userId: string | null = null;
  for (let page = 1; !userId; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) userId = match.id;
    if (data.users.length < 200) break;
  }

  if (!userId) {
    console.error(
      `No Supabase Auth user found for ${email}.\n` +
        "Create it first: Supabase Dashboard → Authentication → Users → Add user (tick 'Auto Confirm User').",
    );
    process.exit(1);
  }

  const name = nameParts.join(" ").trim() || "Admin";
  const { error } = await supabase.from("admins").upsert({ user_id: userId, name }, { onConflict: "user_id" });
  if (error) throw error;

  console.log(`✔ ${email} is now an admin (${name}).`);
}

main().catch((err) => {
  console.error("make-admin failed:", err?.message ?? err);
  process.exit(1);
});
