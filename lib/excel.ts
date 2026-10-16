import "server-only";
import ExcelJS from "exceljs";
import { APP_NAME, ATTENDANCE_META, NIGHT_META, SHIFT_META, type AttendanceStatus } from "@/lib/constants";
import { eachDay, formatDate, formatMonthLong, formatMonthShort, weekdayShort } from "@/lib/dates";
import type { getReportData, ReportFilters } from "@/lib/report-data";
import { groupByDate, wasEmployedOn, type DayShifts } from "@/lib/shift-days";

type ReportData = Awaited<ReturnType<typeof getReportData>>;
type SummaryRow = ReportData["summary"][number];

const GREY_TEXT: Partial<ExcelJS.Font> = { italic: true, color: { argb: "FF6B7280" } };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
const SUB_HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF374151" } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" } };
const NOT_EMPLOYED_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
const TOTAL_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
const THIN: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFD1D5DB" } },
  left: { style: "thin", color: { argb: "FFD1D5DB" } },
  bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
  right: { style: "thin", color: { argb: "FFD1D5DB" } },
};

const fill = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

export function exportFileName(filters: ReportFilters, employee?: { employee_code: string; full_name: string }) {
  const period = `${formatMonthShort(filters.from)}_to_${formatMonthShort(filters.to)}`;
  if (employee) {
    const name = employee.full_name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
    return `Rukhama_${employee.employee_code}_${name}_${period}.xlsx`;
  }
  return `Rukhama_Attendance_${period}.xlsx`;
}

function styleHeader(row: ExcelJS.Row, rowFill = HEADER_FILL) {
  row.eachCell((cell) => {
    cell.fill = rowFill;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = THIN;
  });
}

function borderRow(row: ExcelJS.Row) {
  row.eachCell({ includeEmpty: true }, (c) => (c.border = THIN));
}

/** Colours a status cell (P / A / L) or a night cell (N). */
function paintStatus(cell: ExcelJS.Cell, status: AttendanceStatus | "NIGHT" | undefined) {
  cell.alignment = { horizontal: "center", vertical: "middle" };
  if (status === "NIGHT") {
    cell.value = NIGHT_META.short;
    cell.fill = fill(NIGHT_META.excelFill);
    cell.font = { bold: true };
  } else if (status) {
    cell.value = ATTENDANCE_META[status].short;
    cell.fill = fill(ATTENDANCE_META[status].excelFill);
    cell.font = { bold: true };
  }
}

function newWorkbook(title: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = APP_NAME;
  wb.created = new Date();
  wb.title = title;
  return wb;
}

function indexData(data: ReportData) {
  const periodsByEmp = new Map<string, ReportData["periods"]>();
  for (const p of data.periods) {
    const list = periodsByEmp.get(p.employee_id) ?? [];
    list.push(p);
    periodsByEmp.set(p.employee_id, list);
  }
  const rowsByEmp = new Map<string, ReportData["attendance"]>();
  for (const a of data.attendance) {
    const list = rowsByEmp.get(a.employee_id) ?? [];
    list.push(a);
    rowsByEmp.set(a.employee_id, list);
  }
  const daysByEmp = new Map<string, Map<string, DayShifts>>();
  for (const [id, rows] of rowsByEmp) daysByEmp.set(id, groupByDate(rows));
  return { periodsByEmp, daysByEmp };
}

// ---------------- shared sheets ----------------

const SUMMARY_COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: "Code", key: "code", width: 11 },
  { header: "Employee", key: "name", width: 26 },
  { header: "Role", key: "role", width: 12 },
  { header: "Status", key: "status", width: 10 },
  { header: "Shift 1 present", key: "s1", width: 10 },
  { header: "Shift 2 present", key: "s2", width: 10 },
  { header: "Night shifts", key: "night", width: 10 },
  { header: "Days worked", key: "days", width: 10 },
  { header: "Leave (shifts)", key: "leave", width: 10 },
  { header: "Leave days", key: "ldays", width: 10 },
  { header: "Absent (shifts)", key: "absent", width: 10 },
];

function addSummarySheet(wb: ExcelJS.Workbook, summary: SummaryRow[]) {
  const ws = wb.addWorksheet("Summary", { views: [{ state: "frozen", xSplit: 2, ySplit: 1 }] });
  ws.columns = SUMMARY_COLUMNS;
  styleHeader(ws.getRow(1));
  ws.getRow(1).height = 32;
  for (const s of summary) {
    borderRow(
      ws.addRow({
        code: s.employee_code,
        name: s.full_name,
        role: s.role,
        status: s.status === "ACTIVE" ? "Active" : "Exited",
        s1: s.shift1_present,
        s2: s.shift2_present,
        night: s.night_shifts,
        days: s.days_worked,
        leave: s.leave_shifts,
        ldays: s.leave_days,
        absent: s.absent_shifts,
      }),
    );
  }
  const n = summary.length;
  if (n > 1) {
    const sum = (col: string) => ({ formula: `SUM(${col}2:${col}${n + 1})` });
    const total = ws.addRow({
      name: "TOTAL",
      s1: sum("E"),
      s2: sum("F"),
      night: sum("G"),
      days: sum("H"),
      leave: sum("I"),
      ldays: sum("J"),
      absent: sum("K"),
    });
    total.font = { bold: true };
    total.eachCell({ includeEmpty: true }, (c) => {
      c.border = THIN;
      c.fill = TOTAL_FILL;
    });
  }
  ws.addRow([]);
  ws.addRow([
    `Shift 1 = ${SHIFT_META.MORNING.time}, Shift 2 = ${SHIFT_META.EVENING.time}, Night = ${SHIFT_META.NIGHT.time}. ` +
      `Days worked = dates with at least one shift present. Leave days = dates with any shift on leave.`,
  ]).getCell(1).font = GREY_TEXT;
}

function addNightLeaveSheet(wb: ExcelJS.Workbook, data: ReportData, daysByEmp: Map<string, Map<string, DayShifts>>) {
  const ws = wb.addWorksheet("Night & Leave Dates", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Employee", key: "name", width: 26 },
    { header: "Code", key: "code", width: 11 },
    { header: "Type", key: "type", width: 13 },
    { header: "Date", key: "date", width: 13 },
    { header: "Day", key: "day", width: 7 },
    { header: "Shift(s)", key: "shifts", width: 18 },
    { header: "Note", key: "note", width: 50 },
  ];
  styleHeader(ws.getRow(1));
  let count = 0;
  for (const s of data.summary) {
    const days = daysByEmp.get(s.employee_id);
    if (!days) continue;
    for (const [date, d] of [...days.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const notes = (shift: string) => d.notes.filter((n) => n.shift === shift).map((n) => n.note);
      if (d.NIGHT) {
        const row = ws.addRow({
          name: s.full_name,
          code: s.employee_code,
          type: "Night shift",
          date: formatDate(date),
          day: weekdayShort(date),
          shifts: SHIFT_META.NIGHT.time,
          note: notes("NIGHT").join("; "),
        });
        borderRow(row);
        row.getCell("type").fill = fill(NIGHT_META.excelFill);
        count++;
      }
      const leaveShifts = (["MORNING", "EVENING"] as const).filter((sh) => d[sh] === "LEAVE");
      if (leaveShifts.length) {
        const row = ws.addRow({
          name: s.full_name,
          code: s.employee_code,
          type: leaveShifts.length === 2 ? "Leave (full day)" : "Leave (half day)",
          date: formatDate(date),
          day: weekdayShort(date),
          shifts: leaveShifts.map((sh) => SHIFT_META[sh].label).join(" + "),
          note: leaveShifts.flatMap((sh) => notes(sh)).join("; "),
        });
        borderRow(row);
        row.getCell("type").fill = fill(ATTENDANCE_META.LEAVE.excelFill);
        count++;
      }
    }
  }
  if (count === 0) ws.addRow({ name: "No night shifts or leaves in this period." }).getCell(1).font = GREY_TEXT;
}

function addJoinExitSheet(wb: ExcelJS.Workbook, data: ReportData) {
  const log = wb.addWorksheet("Join-Exit Log", { views: [{ state: "frozen", ySplit: 1 }] });
  log.columns = [
    { header: "Date", key: "date", width: 13 },
    { header: "Event", key: "event", width: 10 },
    { header: "Code", key: "code", width: 11 },
    { header: "Employee", key: "name", width: 26 },
    { header: "Description", key: "desc", width: 60 },
  ];
  styleHeader(log.getRow(1));
  for (const e of data.log) {
    const row = log.addRow({
      date: formatDate(e.date),
      event: e.type === "JOINED" ? "Joined" : "Exited",
      code: e.employee_code,
      name: e.full_name,
      desc: e.description ?? "",
    });
    row.eachCell({ includeEmpty: true }, (c) => {
      c.border = THIN;
      c.alignment = { vertical: "top", wrapText: true };
    });
    row.getCell(2).font = { bold: true, color: { argb: e.type === "JOINED" ? "FF047857" : "FFB91C1C" } };
  }
  if (data.log.length === 0) log.addRow({ desc: "No joins or exits in this period." }).getCell(5).font = GREY_TEXT;
}

const LEGEND =
  "P = Present, A = Absent, L = Leave, N = Night shift worked, - = not employed that day, blank = not marked. " +
  `S1 = Shift 1 (${SHIFT_META.MORNING.time}), S2 = Shift 2 (${SHIFT_META.EVENING.time}), N = Night (${SHIFT_META.NIGHT.time}).`;

// ---------------- all-employees workbook ----------------

export async function buildAttendanceWorkbook(data: ReportData, filters: ReportFilters) {
  const wb = newWorkbook(`${APP_NAME} ${formatMonthLong(filters.from)} - ${formatMonthLong(filters.to)}`);
  const days = eachDay(data.start, data.end);
  const { periodsByEmp, daysByEmp } = indexData(data);

  // Sheet 1: grid, 3 columns (S1, S2, N) per day
  const ws = wb.addWorksheet("Attendance", { views: [{ state: "frozen", xSplit: 1, ySplit: 2 }] });
  const FIXED = 3;
  ws.getColumn(1).width = 26;
  ws.getColumn(2).width = 11;
  ws.getColumn(3).width = 11;
  const top = ws.getRow(1);
  const sub = ws.getRow(2);
  ["Employee", "Code", "Role"].forEach((h, i) => {
    top.getCell(i + 1).value = h;
    ws.mergeCells(1, i + 1, 2, i + 1);
  });
  days.forEach((d, i) => {
    const col = FIXED + 1 + i * 3;
    top.getCell(col).value = `${d.slice(8, 10)}-${d.slice(5, 7)} ${weekdayShort(d)}`;
    ws.mergeCells(1, col, 1, col + 2);
    ["S1", "S2", "N"].forEach((label, j) => {
      sub.getCell(col + j).value = label;
      ws.getColumn(col + j).width = 3.6;
    });
  });
  const totalsStart = FIXED + days.length * 3 + 1;
  const totalHeaders = ["S1 P", "S2 P", "Night", "Leave", "Absent"];
  totalHeaders.forEach((h, i) => {
    top.getCell(totalsStart + i).value = h;
    ws.mergeCells(1, totalsStart + i, 2, totalsStart + i);
    ws.getColumn(totalsStart + i).width = 7;
  });
  styleHeader(top);
  styleHeader(sub, SUB_HEADER_FILL);
  top.height = 22;

  for (const emp of data.summary) {
    const periods = periodsByEmp.get(emp.employee_id) ?? [];
    const empDays = daysByEmp.get(emp.employee_id);
    const row = ws.addRow([]);
    row.getCell(1).value = emp.full_name;
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = emp.employee_code;
    row.getCell(3).value = emp.role;
    days.forEach((d, i) => {
      const col = FIXED + 1 + i * 3;
      const rec = empDays?.get(d);
      const cells = [row.getCell(col), row.getCell(col + 1), row.getCell(col + 2)];
      if (!rec && !wasEmployedOn(periods, d)) {
        cells.forEach((c) => {
          c.value = "-";
          c.fill = NOT_EMPLOYED_FILL;
          c.font = { color: { argb: "FF9CA3AF" } };
          c.alignment = { horizontal: "center" };
        });
        return;
      }
      paintStatus(cells[0], rec?.MORNING);
      paintStatus(cells[1], rec?.EVENING);
      paintStatus(cells[2], rec?.NIGHT ? "NIGHT" : undefined);
    });
    [emp.shift1_present, emp.shift2_present, emp.night_shifts, emp.leave_shifts, emp.absent_shifts].forEach((v, i) => {
      const c = row.getCell(totalsStart + i);
      c.value = v;
      c.alignment = { horizontal: "center" };
      c.font = { bold: true };
    });
    for (let c = 1; c < totalsStart + totalHeaders.length; c++) row.getCell(c).border = THIN;
  }
  ws.addRow([]);
  ws.addRow([LEGEND]).getCell(1).font = GREY_TEXT;

  addSummarySheet(wb, data.summary);
  addNightLeaveSheet(wb, data, daysByEmp);
  addJoinExitSheet(wb, data);
  return wb;
}

// ---------------- single-employee workbook ----------------

export async function buildEmployeeWorkbook(data: ReportData, filters: ReportFilters) {
  const emp = data.summary[0];
  const wb = newWorkbook(`${emp?.full_name ?? "Employee"} ${formatMonthLong(filters.from)} - ${formatMonthLong(filters.to)}`);
  const { periodsByEmp, daysByEmp } = indexData(data);
  const periods = emp ? (periodsByEmp.get(emp.employee_id) ?? []) : [];
  const empDays = emp ? daysByEmp.get(emp.employee_id) : undefined;

  const ws = wb.addWorksheet("Daily", { views: [{ state: "frozen", ySplit: 3 }] });
  ws.columns = [
    { key: "date", width: 13 },
    { key: "day", width: 7 },
    { key: "s1", width: 12 },
    { key: "s2", width: 12 },
    { key: "n", width: 12 },
    { key: "note", width: 55 },
  ];
  const title = ws.addRow([
    emp ? `${emp.full_name} (${emp.employee_code}) · ${emp.role}` : "Employee",
  ]);
  title.font = { bold: true, size: 13 };
  ws.addRow([
    `${formatMonthLong(filters.from)}${filters.from !== filters.to ? ` – ${formatMonthLong(filters.to)}` : ""}`,
  ]).getCell(1).font = GREY_TEXT;
  const header = ws.addRow([
    "Date",
    "Day",
    `Shift 1\n${SHIFT_META.MORNING.time}`,
    `Shift 2\n${SHIFT_META.EVENING.time}`,
    `Night\n${SHIFT_META.NIGHT.time}`,
    "Notes",
  ]);
  styleHeader(header);
  header.height = 32;

  const label = (s?: AttendanceStatus) => (s ? ATTENDANCE_META[s].label : "");
  for (const d of eachDay(data.start, data.end)) {
    const rec = empDays?.get(d);
    const employed = wasEmployedOn(periods, d);
    const row = ws.addRow({
      date: formatDate(d),
      day: weekdayShort(d),
      s1: employed || rec ? label(rec?.MORNING) : "Not employed",
      s2: employed || rec ? label(rec?.EVENING) : "",
      n: rec?.NIGHT ? "Worked" : "",
      note: (rec?.notes ?? []).map((n) => `${SHIFT_META[n.shift].short}: ${n.note}`).join("; "),
    });
    borderRow(row);
    if (!employed && !rec) {
      row.eachCell({ includeEmpty: true }, (c) => {
        c.fill = NOT_EMPLOYED_FILL;
        c.font = { color: { argb: "FF9CA3AF" } };
      });
      continue;
    }
    if (rec?.MORNING) row.getCell("s1").fill = fill(ATTENDANCE_META[rec.MORNING].excelFill);
    if (rec?.EVENING) row.getCell("s2").fill = fill(ATTENDANCE_META[rec.EVENING].excelFill);
    if (rec?.NIGHT) row.getCell("n").fill = fill(NIGHT_META.excelFill);
    ["s1", "s2", "n"].forEach((k) => (row.getCell(k).alignment = { horizontal: "center" }));
  }

  addSummarySheet(wb, data.summary);
  addNightLeaveSheet(wb, data, daysByEmp);
  addJoinExitSheet(wb, data);
  return wb;
}
