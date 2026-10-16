"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Filter, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addMonths, formatMonthLong } from "@/lib/dates";
import type { ReportFilters as Filters } from "@/lib/report-data";
import { cn } from "@/lib/utils";

const MAX_MONTHS = 12;

type Employee = { id: string; employee_code: string; full_name: string; status: string };

export function ReportFilters({
  filters,
  currentMonth,
  employees,
  downloadHref,
  hasData,
}: {
  filters: Filters;
  currentMonth: string;
  employees: Employee[];
  downloadHref: string;
  hasData: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"single" | "range">(filters.from === filters.to ? "single" : "range");
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [selected, setSelected] = useState<string[]>(filters.employeeIds ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // last 5 years of months, newest first
  const months = useMemo(
    () => Array.from({ length: 60 }, (_, i) => addMonths(currentMonth, -i)),
    [currentMonth],
  );
  const toOptions = months.filter((m) => m >= from && m <= addMonths(from, MAX_MONTHS - 1));

  const apply = () => {
    const end = mode === "single" ? from : to < from ? from : to;
    const params = new URLSearchParams({ from, to: end });
    if (selected.length) params.set("emp", selected.join(","));
    router.push(`/reports?${params.toString()}`);
  };

  const employeeLabel =
    selected.length === 0
      ? "All employees"
      : selected.length === 1
        ? (employees.find((e) => e.id === selected[0])?.full_name ?? "1 employee")
        : `${selected.length} employees`;

  const applied =
    from === filters.from &&
    (mode === "single" ? from === filters.to : to === filters.to) &&
    selected.join(",") === (filters.employeeIds ?? []).join(",");

  return (
    <Card className="mb-4">
      <CardContent className="grid gap-4">
        <div className="inline-flex w-fit rounded-lg bg-muted p-1 text-sm">
          {(["single", "range"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium text-muted-foreground",
                mode === m && "bg-background text-foreground shadow-sm",
              )}
            >
              {m === "single" ? "Single month" : "Month range"}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label>{mode === "single" ? "Month" : "From"}</Label>
            <Select
              value={from}
              onValueChange={(v) => {
                setFrom(v);
                if (to < v || to > addMonths(v, MAX_MONTHS - 1)) setTo(v);
              }}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {months.map((m) => (
                  <SelectItem key={m} value={m}>
                    {formatMonthLong(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "range" && (
            <div className="grid gap-2">
              <Label>To (max {MAX_MONTHS} months)</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {toOptions.map((m) => (
                    <SelectItem key={m} value={m}>
                      {formatMonthLong(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Employees</Label>
            <Button variant="outline" className="h-10 justify-start" onClick={() => setPickerOpen(true)}>
              <Users /> <span className="truncate">{employeeLabel}</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant={applied ? "outline" : "default"} className="h-10" onClick={apply}>
            <Filter /> {applied ? "Preview shown below" : "Show preview"}
          </Button>
          <Button
            asChild={applied && hasData}
            variant={applied ? "default" : "outline"}
            className="h-10"
            disabled={!applied || !hasData}
            onClick={() => {
              setDownloading(true);
              setTimeout(() => setDownloading(false), 4000);
            }}
          >
            {applied && hasData ? (
              <a href={downloadHref} download>
                <Download /> {downloading ? "Preparing Excel…" : "Download Excel"}
              </a>
            ) : (
              <span className="flex items-center gap-2">
                <Download /> Download Excel
              </span>
            )}
          </Button>
        </div>
        {!applied && (
          <p className="text-xs text-muted-foreground">Show the preview first, then download the same data as Excel.</p>
        )}
      </CardContent>

      <EmployeePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        employees={employees}
        selected={selected}
        onChange={setSelected}
      />
    </Card>
  );
}

function EmployeePicker({
  open,
  onOpenChange,
  employees,
  selected,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[]>(selected);

  const filtered = employees.filter((e) => {
    const q = query.trim().toLowerCase();
    return !q || e.full_name.toLowerCase().includes(q) || e.employee_code.toLowerCase().includes(q);
  });

  const toggle = (id: string) => setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft(selected);
        onOpenChange(o);
      }}
    >
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose employees</DialogTitle>
          <DialogDescription>Leave everything unticked to include all employees.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-10 pl-9" />
        </div>
        <ul className="-mx-1 min-h-0 flex-1 overflow-y-auto">
          {filtered.map((e) => (
            <li key={e.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 hover:bg-muted">
                <Checkbox checked={draft.includes(e.id)} onCheckedChange={() => toggle(e.id)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{e.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.employee_code}
                    {e.status === "EXITED" && " · Exited"}
                  </span>
                </span>
              </label>
            </li>
          ))}
          {filtered.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No match</li>}
        </ul>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => setDraft([])}>
            Clear (all employees)
          </Button>
          <Button
            onClick={() => {
              onChange(draft);
              onOpenChange(false);
            }}
          >
            Done{draft.length ? ` (${draft.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
