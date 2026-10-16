import type { Metadata } from "next";
import { EmployeeList } from "@/components/employees/employee-list";
import type { EmployeeListItem } from "@/components/employees/types";
import { requireAdmin } from "@/lib/auth";
import { PHOTO_BUCKET } from "@/lib/constants";
import { fetchAllRows } from "@/lib/fetch-all";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage() {
  const { supabase } = await requireAdmin();

  const [employees, periods] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from("employees")
        .select("id, employee_code, full_name, phone, address, role, status, photo_path")
        .order("full_name")
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("employment_periods")
        .select("employee_id, join_date, exit_date")
        .order("join_date", { ascending: false })
        .range(from, to),
    ),
  ]);

  // periods are newest first, so the first one seen per employee is the latest
  const latest = new Map<string, { join_date: string; exit_date: string | null }>();
  for (const p of periods) if (!latest.has(p.employee_id)) latest.set(p.employee_id, p);

  const paths = employees.map((e) => e.photo_path).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 60 * 60);
    for (const item of data ?? []) if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl);
  }

  const items: EmployeeListItem[] = employees.map((e) => {
    const period = latest.get(e.id);
    return {
      id: e.id,
      employee_code: e.employee_code,
      full_name: e.full_name,
      phone: e.phone,
      address: e.address,
      role: e.role,
      status: e.status,
      has_photo: !!e.photo_path,
      photo_url: e.photo_path ? (signed.get(e.photo_path) ?? null) : null,
      join_date: period?.join_date ?? null,
      exit_date: e.status === "EXITED" ? (period?.exit_date ?? null) : null,
    };
  });

  return <EmployeeList employees={items} />;
}
