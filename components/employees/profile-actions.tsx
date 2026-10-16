"use client";

import { useState } from "react";
import { LogIn, LogOut, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { EditPeriodDialog, ExitDialog, RejoinDialog, type PeriodForEdit } from "./status-dialogs";
import type { EmployeeListItem } from "./types";

export function ProfileActions({ employee }: { employee: EmployeeListItem }) {
  const [editOpen, setEditOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [rejoinOpen, setRejoinOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => setEditOpen(true)}>
        <Pencil /> Edit
      </Button>
      {employee.status === "ACTIVE" ? (
        <Button variant="destructive" onClick={() => setExitOpen(true)}>
          <LogOut /> Mark exit
        </Button>
      ) : (
        <Button onClick={() => setRejoinOpen(true)}>
          <RotateCcw /> Rejoin
        </Button>
      )}
      <EmployeeFormDialog open={editOpen} onOpenChange={setEditOpen} employee={employee} />
      <ExitDialog employee={exitOpen ? employee : null} joinDate={employee.join_date} onOpenChange={setExitOpen} />
      <RejoinDialog employee={rejoinOpen ? employee : null} lastExitDate={employee.exit_date} onOpenChange={setRejoinOpen} />
    </div>
  );
}

export function PeriodTimeline({ periods }: { periods: PeriodForEdit[] }) {
  const [editing, setEditing] = useState<PeriodForEdit | null>(null);

  if (periods.length === 0) return <p className="text-sm text-muted-foreground">No history recorded.</p>;

  return (
    <>
      <ol className="relative space-y-5 border-l pl-5">
        {periods.map((p, i) => (
          <li key={p.id} className="relative">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Period {periods.length - i}
                {!p.exit_date && " · current"}
              </p>
              <Button variant="ghost" size="icon-sm" aria-label="Edit this period" onClick={() => setEditing(p)}>
                <Pencil />
              </Button>
            </div>
            {p.exit_date && (
              <div className="relative mb-3">
                <span className="absolute top-1 -left-[27px] flex size-3 rounded-full bg-amber-500 ring-4 ring-background" />
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <LogOut className="size-3.5 text-amber-600" /> Exited {formatDate(p.exit_date)}
                </p>
                {p.exit_description && <p className="mt-0.5 text-sm text-muted-foreground">{p.exit_description}</p>}
              </div>
            )}
            <div className="relative">
              <span className="absolute top-1 -left-[27px] flex size-3 rounded-full bg-emerald-500 ring-4 ring-background" />
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <LogIn className="size-3.5 text-emerald-600" /> {i === periods.length - 1 ? "Joined" : "Rejoined"}{" "}
                {formatDate(p.join_date)}
              </p>
              {p.join_description && <p className="mt-0.5 text-sm text-muted-foreground">{p.join_description}</p>}
            </div>
          </li>
        ))}
      </ol>
      <EditPeriodDialog period={editing} onOpenChange={(o) => !o && setEditing(null)} />
    </>
  );
}
