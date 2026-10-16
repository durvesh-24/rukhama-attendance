"use client";

import { useActionState, useEffect, useRef } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action-result";
import { changePassword } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(changePassword, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Password changed.");
      formRef.current?.reset();
    } else {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="current">Current password</Label>
        <Input id="current" name="current" type="password" autoComplete="current-password" required className="h-10" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="h-10" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className="h-10" />
      </div>
      <Button type="submit" disabled={pending} className="h-10 w-fit">
        {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
        Update password
      </Button>
    </form>
  );
}
