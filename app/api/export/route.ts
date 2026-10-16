import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin, NotAdminError } from "@/lib/auth";
import { buildAttendanceWorkbook, exportFileName } from "@/lib/excel";
import { getReportData, parseReportFilters } from "@/lib/report-data";

// GET /api/export?from=YYYY-MM&to=YYYY-MM&emp=<id>,<id>
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await assertAdmin();
    const sp = request.nextUrl.searchParams;
    const filters = parseReportFilters({ from: sp.get("from"), to: sp.get("to"), emp: sp.get("emp") });

    const data = await getReportData(supabase, filters);
    const workbook = await buildAttendanceWorkbook(data, filters);
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = exportFileName(filters);

    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof NotAdminError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("Excel export failed", e);
    return NextResponse.json({ error: "Could not create the Excel file." }, { status: 500 });
  }
}
