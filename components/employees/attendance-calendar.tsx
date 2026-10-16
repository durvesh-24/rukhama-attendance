import { ATTENDANCE_META, ATTENDANCE_STATUSES, NIGHT_META, SHIFT_META, type AttendanceStatus } from "@/lib/constants";
import { daysInMonth, formatDate, todayIST, weekday, WEEKDAYS_SHORT } from "@/lib/dates";
import { groupByDate, wasEmployedOn, type ShiftRecord } from "@/lib/shift-days";
import { cn } from "@/lib/utils";

type Props = {
  month: string;
  attendance: ShiftRecord[];
  periods: { join_date: string; exit_date: string | null }[];
};

function Bar({ status, label }: { status?: AttendanceStatus; label: string }) {
  return (
    <span
      title={label}
      className={cn(
        "flex h-3.5 flex-1 items-center justify-center rounded-[3px] text-[9px] leading-none font-bold sm:h-4",
        status ? ATTENDANCE_META[status].className : "bg-muted text-transparent",
      )}
    >
      {status ? ATTENDANCE_META[status].short : "·"}
    </span>
  );
}

export function AttendanceCalendar({ month, attendance, periods }: Props) {
  const total = daysInMonth(month);
  const firstWeekday = weekday(`${month}-01`);
  const today = todayIST();
  const byDate = groupByDate(attendance);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {Array.from({ length: total }).map((_, i) => {
          const day = i + 1;
          const date = `${month}-${String(day).padStart(2, "0")}`;
          const rec = byDate.get(date);
          const working = wasEmployedOn(periods, date);
          const title = [
            formatDate(date),
            !working && !rec ? "Not employed" : "",
            rec?.MORNING ? `Shift 1: ${ATTENDANCE_META[rec.MORNING].label}` : "",
            rec?.EVENING ? `Shift 2: ${ATTENDANCE_META[rec.EVENING].label}` : "",
            rec?.NIGHT ? "Night shift" : "",
            ...(rec?.notes ?? []).map((n) => `${SHIFT_META[n.shift].short}: ${n.note}`),
          ]
            .filter(Boolean)
            .join("\n");
          return (
            <div
              key={date}
              title={title}
              className={cn(
                "flex min-h-14 flex-col gap-0.5 rounded-md border p-1 text-xs sm:min-h-16",
                !working && !rec && "border-dashed bg-muted/40 text-muted-foreground/50",
                date === today && "ring-2 ring-primary",
              )}
            >
              <span className="flex items-center justify-between leading-none">
                <span className="font-medium">{day}</span>
                {rec?.NIGHT && (
                  <span className={cn("rounded px-1 text-[9px] font-bold", NIGHT_META.className)} title="Night shift">
                    N
                  </span>
                )}
              </span>
              {(working || rec) && (
                <span className="mt-auto flex gap-0.5">
                  <Bar status={rec?.MORNING} label="Shift 1" />
                  <Bar status={rec?.EVENING} label="Shift 2" />
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>Each day: left bar = Shift 1, right bar = Shift 2</span>
        {ATTENDANCE_STATUSES.map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className={cn("inline-block size-3 rounded-sm", ATTENDANCE_META[s].className)} />
            {ATTENDANCE_META[s].label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className={cn("inline-block size-3 rounded-sm", NIGHT_META.className)} />
          Night shift
        </span>
      </div>
    </div>
  );
}
