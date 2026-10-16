import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin, NotAdminError } from "@/lib/auth";
import { buildEmployeeWorkbook, exportFileName } from "@/lib/excel";
import { getReportData, parseReportFilters } from "@/lib/report-data";

// GET /api/export/employee?emp=<id>&from=YYYY-MM&to=YYYY-MM
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await assertAdmin();
    const sp = request.nextUrl.searchParams;
    const filters = parseReportFilters({ from: sp.get("from"), to: sp.get("to"), emp: sp.get("emp") });
    if (!filters.employeeIds || filters.employeeIds.length !== 1) {
      return NextResponse.json({ error: "Choose one employee." }, { status: 400 });
    }

    const data = await getReportData(supabase, filters);
    const emp = data.summary[0];
    if (!emp) return NextResponse.json({ error: "No data for this employee in that period." }, { status: 404 });

    const workbook = await buildEmployeeWorkbook(data, filters);
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${exportFileName(filters, emp)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof NotAdminError) return NextResponse.json({ error: e.message }, { status: 403 });
    console.error("Employee Excel export failed", e);
    return NextResponse.json({ error: "Could not create the Excel file." }, { status: 500 });
  }
}
