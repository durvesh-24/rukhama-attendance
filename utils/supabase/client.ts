import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

// Browser client: uses only the public anon / publishable key.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
