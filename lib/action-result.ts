import { NotAdminError } from "@/lib/auth";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string };

/** Turns thrown errors (auth, zod, Postgres) into a friendly ActionResult. */
export function toErrorResult(err: unknown): { ok: false; error: string } {
  if (err instanceof NotAdminError) return { ok: false, error: err.message };
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return { ok: false, error: err.message };
  }
  return { ok: false, error: "Something went wrong. Please try again." };
}
