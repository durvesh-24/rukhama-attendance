"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  MessageSquare,
  Moon,
  Save,
  Search,
  Sun,
  Sunset,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { saveAttendance } from "@/app/(app)/attendance/actions";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ATTENDANCE_META,
  ATTENDANCE_STATUSES,
  NIGHT_META,
  SHIFT_META,
  SHIFTS,
  type AttendanceStatus,
  type Shift,
} from "@/lib/constants";
import { addDays, formatDate, weekdayShort } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Employee = { id: string; employee_code: string; full_name: string; role: string };
type Mark = { status: AttendanceStatus | null; note: string };
type Marks = Record<string, Mark>; // key: `${employeeId}|${shift}`

type Props = {
  date: string;
  today: string;
  initialShift: Shift;
  employees: Employee[];
  existing: { employee_id: string; shift: string; status: string; note: string | null }[];
};

const SHIFT_ICON = { MORNING: Sun, EVENING: Sunset, NIGHT: Moon } as const;
const EMPTY: Mark = { status: null, note: "" };
const k = (id: string, shift: Shift) => `${id}|${shift}`;
const same = (a: Mark | undefined, b: Mark | undefined) =>
  (a?.status ?? null) === (b?.status ?? null) && (a?.note ?? "") === (b?.note ?? "");

export function AttendanceMarker({ date, today, initialShift, employees, existing }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [shift, setShift] = useState<Shift>(initialShift);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const initial = useMemo(() => {
    const m: Marks = {};
    for (const e of existing) {
      m[k(e.employee_id, e.shift as Shift)] = { status: e.status as AttendanceStatus, note: e.note ?? "" };
    }
    return m;
  }, [existing]);

  const [saved, setSaved] = useState<Marks>(initial);
  const [marks, setMarks] = useState<Marks>(initial);

  const dirtyKeys = useMemo(() => {
    const out: { id: string; shift: Shift }[] = [];
    for (const e of employees) for (const s of SHIFTS) if (!same(marks[k(e.id, s)], saved[k(e.id, s)])) out.push({ id: e.id, shift: s });
    return out;
  }, [employees, marks, saved]);
  const dirty = dirtyKeys.length > 0;
  const dirtyByShift = (s: Shift) => dirtyKeys.filter((d) => d.shift === s).length;

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const countsFor = (s: Shift) => {
    const c = { PRESENT: 0, ABSENT: 0, LEAVE: 0, UNMARKED: 0 };
    for (const e of employees) c[marks[k(e.id, s)]?.status ?? "UNMARKED"]++;
    return c;
  };
  const counts = countsFor(shift);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => e.full_name.toLowerCase().includes(q) || e.employee_code.toLowerCase().includes(q));
  }, [employees, query]);

  const update = (id: string, s: Shift, patch: Partial<Mark>) =>
    setMarks((prev) => ({ ...prev, [k(id, s)]: { ...EMPTY, ...prev[k(id, s)], ...patch } }));

  const toggleStatus = (id: string, s: Shift, status: AttendanceStatus) =>
    update(id, s, { status: marks[k(id, s)]?.status === status ? null : status });

  const markRestPresent = () =>
    setMarks((prev) => {
      const next = { ...prev };
      for (const e of employees) {
        const key = k(e.id, shift);
        if (!next[key]?.status) next[key] = { ...EMPTY, ...next[key], status: "PRESENT" };
      }
      return next;
    });

  const copyFromShift1 = () =>
    setMarks((prev) => {
      const next = { ...prev };
      for (const e of employees) {
        const from = next[k(e.id, "MORNING")];
        const key = k(e.id, "EVENING");
        if (from?.status && !next[key]?.status) next[key] = { ...EMPTY, ...next[key], status: from.status };
      }
      return next;
    });

  const goToDate = (value: string) => {
    if (!value || value > today) return;
    if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) return;
    router.push(`${pathname}?date=${value}&shift=${shift}`);
  };

  const save = () => {
    const entries = dirtyKeys
      .filter((d) => marks[k(d.id, d.shift)]?.status)
      .map((d) => ({
        employee_id: d.id,
        shift: d.shift,
        status: marks[k(d.id, d.shift)]!.status!,
        note: marks[k(d.id, d.shift)]!.note.trim(),
      }));
    const clear = dirtyKeys
      .filter((d) => !marks[k(d.id, d.shift)]?.status && saved[k(d.id, d.shift)]?.status)
      .map((d) => ({ employee_id: d.id, shift: d.shift }));
    startTransition(async () => {
      const result = await saveAttendance({ date, entries, clear });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved(marks);
      toast.success(`Attendance saved for ${formatDate(date)}`);
      router.refresh();
    });
  };

  const isNight = shift === "NIGHT";
  const shift1Marked = employees.some((e) => marks[k(e.id, "MORNING")]?.status);

  return (
    <>
      <PageHeader title="Attendance" description={`${weekdayShort(date)}, ${formatDate(date)}${date === today ? " (today)" : ""}`}>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Previous day" onClick={() => goToDate(addDays(date, -1))}>
            <ChevronLeft />
          </Button>
          <label className="relative flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className="sr-only">Choose date</span>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => goToDate(e.target.value)}
              className="bg-transparent outline-none [color-scheme:light] dark:[color-scheme:dark]"
            />
          </label>
          <Button variant="outline" size="icon" aria-label="Next day" disabled={date >= today} onClick={() => goToDate(addDays(date, 1))}>
            <ChevronRight />
          </Button>
          {date !== today && (
            <Button variant="ghost" size="sm" onClick={() => goToDate(today)}>
              Today
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Shift tabs */}
      <div role="tablist" aria-label="Shift" className="mb-4 grid grid-cols-3 gap-2">
        {SHIFTS.map((s) => {
          const Icon = SHIFT_ICON[s];
          const c = countsFor(s);
          const active = shift === s;
          const pendingCount = dirtyByShift(s);
          return (
            <button
              key={s}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setShift(s)}
              className={cn(
                "relative rounded-xl border-2 p-2.5 text-left transition-colors sm:p-3",
                active ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <Icon className="size-4" style={{ color: SHIFT_META[s].color }} />
                {SHIFT_META[s].label}
              </span>
              <span className="block text-[11px] text-muted-foreground sm:text-xs">{SHIFT_META[s].time}</span>
              <span className="mt-1 block text-xs font-medium">
                {s === "NIGHT" ? `${c.PRESENT} worked` : `${c.PRESENT} P · ${c.ABSENT} A · ${c.LEAVE} L`}
              </span>
              {pendingCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" aria-label="unsaved changes" />
              )}
            </button>
          );
        })}
      </div>

      {employees.length === 0 ? (
        <EmptyState icon={Users} title="Nobody was working on this date">
          Employees appear here when the date falls between their join and exit dates.
        </EmptyState>
      ) : (
        <>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search employee"
                className="h-10 pl-9"
                aria-label="Search employee"
              />
            </div>
            {!isNight && (
              <Button variant="secondary" className="h-10" onClick={markRestPresent} disabled={counts.UNMARKED === 0}>
                <CheckCheck />
                {counts.UNMARKED === employees.length ? "Mark all present" : `Mark remaining ${counts.UNMARKED} present`}
              </Button>
            )}
            {shift === "EVENING" && shift1Marked && counts.UNMARKED > 0 && (
              <Button variant="outline" className="h-10" onClick={copyFromShift1}>
                <Copy /> Same as Shift 1
              </Button>
            )}
          </div>

          {isNight && (
            <p className="mb-3 rounded-lg bg-indigo-500/10 px-3 py-2 text-sm text-indigo-800 dark:text-indigo-200">
              Night shift is extra work from 9:00 PM. Tap <b>Night</b> only for employees who worked tonight.
            </p>
          )}

          <ul className="grid gap-2">
            {filtered.map((e) => {
              const key = k(e.id, shift);
              const mark = marks[key];
              const isOpen = expanded === key;
              const s1 = marks[k(e.id, "MORNING")]?.status;
              const s2 = marks[k(e.id, "EVENING")]?.status;
              return (
                <li
                  key={e.id}
                  className={cn("rounded-xl border bg-card p-3", !same(mark, saved[key]) && "border-primary/50 bg-primary/5")}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{e.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.employee_code} · {e.role}
                          {isNight && (s1 || s2) && (
                            <>
                              {" · "}S1 {s1 ? ATTENDANCE_META[s1].short : "–"} · S2 {s2 ? ATTENDANCE_META[s2].short : "–"}
                            </>
                          )}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Add note"
                        aria-expanded={isOpen}
                        onClick={() => setExpanded(isOpen ? null : key)}
                        className={cn(mark?.note && "text-primary")}
                      >
                        <MessageSquare />
                      </Button>
                    </div>

                    {isNight ? (
                      <button
                        type="button"
                        aria-pressed={mark?.status === "PRESENT"}
                        onClick={() => toggleStatus(e.id, "NIGHT", "PRESENT")}
                        className={cn(
                          "flex h-12 items-center justify-center gap-2 rounded-lg border-2 px-5 text-sm font-bold transition-colors sm:h-11 sm:w-40",
                          mark?.status === "PRESENT"
                            ? NIGHT_META.activeClassName
                            : "border-border bg-background text-muted-foreground hover:bg-muted",
                        )}
                      >
                        <Moon className="size-4" />
                        {mark?.status === "PRESENT" ? "Night ✓" : "Add night"}
                      </button>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {ATTENDANCE_STATUSES.map((st) => {
                          const active = mark?.status === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              aria-pressed={active}
                              aria-label={`${ATTENDANCE_META[st].label} – ${e.full_name}`}
                              title={ATTENDANCE_META[st].label}
                              onClick={() => toggleStatus(e.id, shift, st)}
                              className={cn(
                                "h-12 min-w-14 rounded-lg border-2 text-base font-bold transition-colors sm:h-11 sm:w-14",
                                active ? ATTENDANCE_META[st].activeClassName : "border-border bg-background text-muted-foreground hover:bg-muted",
                              )}
                            >
                              {ATTENDANCE_META[st].short}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {isOpen && (
                    <Input
                      value={mark?.note ?? ""}
                      onChange={(ev) => update(e.id, shift, { note: ev.target.value })}
                      placeholder={`Note for ${SHIFT_META[shift].label} (optional)`}
                      maxLength={300}
                      className="mt-3 h-10"
                      aria-label={`Note for ${e.full_name}`}
                    />
                  )}
                </li>
              );
            })}
          </ul>

          <div className="sticky bottom-20 z-30 mt-4 md:bottom-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
              <p className="text-sm text-muted-foreground">
                {dirty
                  ? `${dirtyKeys.length} unsaved change${dirtyKeys.length > 1 ? "s" : ""}${
                      SHIFTS.filter((s) => dirtyByShift(s)).length > 1 ? " across shifts" : ""
                    }`
                  : "All changes saved"}
              </p>
              <Button onClick={save} disabled={!dirty || pending} className="h-11 px-6">
                {pending ? <Loader2 className="animate-spin" /> : <Save />}
                Save
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
