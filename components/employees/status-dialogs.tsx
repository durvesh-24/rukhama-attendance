"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exitEmployee, rejoinEmployee, updatePeriod } from "@/app/(app)/employees/actions";
import type { ActionResult } from "@/lib/action-result";
import { formatDate, todayIST } from "@/lib/dates";

type Target = { id: string; full_name: string; employee_code: string };

function useSubmit(action: (fd: FormData) => Promise<ActionResult>, success: string, onDone: () => void) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await action(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      onDone();
      router.refresh();
    });
  };
  return { pending, onSubmit };
}

function Footer({ pending, onCancel, label, destructive }: { pending: boolean; onCancel: () => void; label: string; destructive?: boolean }) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {label}
      </Button>
    </DialogFooter>
  );
}

export function ExitDialog({
  employee,
  joinDate,
  onOpenChange,
}: {
  employee: Target | null;
  joinDate?: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const close = () => onOpenChange(false);
  const { pending, onSubmit } = useSubmit(exitEmployee, "Exit recorded", close);
  return (
    <Dialog open={!!employee} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {employee && (
          <form onSubmit={onSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Mark exit — {employee.full_name}</DialogTitle>
              <DialogDescription>
                The employee and all past attendance are kept. They can rejoin later.
                {joinDate ? ` Current period started ${formatDate(joinDate)}.` : ""}
              </DialogDescription>
            </DialogHeader>
            <input type="hidden" name="employee_id" value={employee.id} />
            <div className="grid gap-2">
              <Label htmlFor="exit_date">Last working day *</Label>
              <Input
                id="exit_date"
                name="exit_date"
                type="date"
                required
                min={joinDate ?? undefined}
                defaultValue={todayIST()}
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="exit_description">Reason / note</Label>
              <Textarea id="exit_description" name="exit_description" rows={3} maxLength={500} placeholder="e.g. Season over, went back to village" />
            </div>
            <Footer pending={pending} onCancel={close} label="Mark exit" destructive />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function RejoinDialog({
  employee,
  lastExitDate,
  onOpenChange,
}: {
  employee: Target | null;
  lastExitDate?: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const close = () => onOpenChange(false);
  const { pending, onSubmit } = useSubmit(rejoinEmployee, "Employee rejoined", close);
  return (
    <Dialog open={!!employee} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {employee && (
          <form onSubmit={onSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Rejoin — {employee.full_name}</DialogTitle>
              <DialogDescription>
                Starts a new working period for {employee.employee_code}.
                {lastExitDate ? ` Last exit was ${formatDate(lastExitDate)}.` : ""}
              </DialogDescription>
            </DialogHeader>
            <input type="hidden" name="employee_id" value={employee.id} />
            <div className="grid gap-2">
              <Label htmlFor="rejoin_date">Rejoin date *</Label>
              <Input id="rejoin_date" name="join_date" type="date" required defaultValue={todayIST()} className="h-10" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rejoin_description">Note</Label>
              <Textarea id="rejoin_description" name="join_description" rows={3} maxLength={500} placeholder="e.g. Back for Diwali bookings" />
            </div>
            <Footer pending={pending} onCancel={close} label="Rejoin" />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export type PeriodForEdit = {
  id: string;
  employee_id: string;
  join_date: string;
  join_description: string | null;
  exit_date: string | null;
  exit_description: string | null;
};

export function EditPeriodDialog({
  period,
  onOpenChange,
}: {
  period: PeriodForEdit | null;
  onOpenChange: (open: boolean) => void;
}) {
  const close = () => onOpenChange(false);
  const { pending, onSubmit } = useSubmit(updatePeriod, "Period updated", close);
  return (
    <Dialog open={!!period} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        {period && (
          <form key={period.id} onSubmit={onSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Edit join / exit details</DialogTitle>
              <DialogDescription>Leave the exit date empty if the employee is still working in this period.</DialogDescription>
            </DialogHeader>
            <input type="hidden" name="period_id" value={period.id} />
            <input type="hidden" name="employee_id" value={period.employee_id} />
            <div className="grid gap-2">
              <Label htmlFor="p_join_date">Join date *</Label>
              <Input id="p_join_date" name="join_date" type="date" required defaultValue={period.join_date} className="h-10" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p_join_description">Joining note</Label>
              <Textarea id="p_join_description" name="join_description" rows={2} maxLength={500} defaultValue={period.join_description ?? ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p_exit_date">Exit date</Label>
              <Input id="p_exit_date" name="exit_date" type="date" defaultValue={period.exit_date ?? ""} className="h-10" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p_exit_description">Exit note</Label>
              <Textarea id="p_exit_description" name="exit_description" rows={2} maxLength={500} defaultValue={period.exit_description ?? ""} />
            </div>
            <Footer pending={pending} onCancel={close} label="Save" />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
