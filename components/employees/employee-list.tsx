"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, MoreVertical, Pencil, Phone, Plus, RotateCcw, Search, UserRound, Users } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLES } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { EmployeeAvatar } from "./employee-avatar";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { ExitDialog, RejoinDialog } from "./status-dialogs";
import type { EmployeeListItem } from "./types";

export function StatusBadge({ status }: { status: string }) {
  return status === "ACTIVE" ? (
    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Active</Badge>
  ) : (
    <Badge variant="secondary">Exited</Badge>
  );
}

export function EmployeeList({ employees }: { employees: EmployeeListItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "EXITED">("ACTIVE");
  const [role, setRole] = useState("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeListItem | null>(null);
  const [exiting, setExiting] = useState<EmployeeListItem | null>(null);
  const [rejoining, setRejoining] = useState<EmployeeListItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter(
      (e) =>
        (status === "ALL" || e.status === status) &&
        (role === "ALL" || e.role === role) &&
        (!q ||
          e.full_name.toLowerCase().includes(q) ||
          e.employee_code.toLowerCase().includes(q) ||
          (e.phone ?? "").replace(/\s/g, "").includes(q.replace(/\s/g, ""))),
    );
  }, [employees, query, status, role]);

  const activeCount = employees.filter((e) => e.status === "ACTIVE").length;

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (e: EmployeeListItem) => {
    setEditing(e);
    setFormOpen(true);
  };

  const actions = (e: EmployeeListItem) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${e.full_name}`}>
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => router.push(`/employees/${e.id}`)}>
          <UserRound /> View profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openEdit(e)}>
          <Pencil /> Edit details
        </DropdownMenuItem>
        {e.status === "ACTIVE" ? (
          <DropdownMenuItem variant="destructive" onSelect={() => setExiting(e)}>
            <LogOut /> Mark exit
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => setRejoining(e)}>
            <RotateCcw /> Rejoin
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <PageHeader title="Employees" description={`${activeCount} active · ${employees.length} total`}>
        <Button onClick={openAdd} className="h-10">
          <Plus /> Add employee
        </Button>
      </PageHeader>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone or code"
            className="h-10 pl-9"
            aria-label="Search employees"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="h-10 w-full sm:w-36" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="EXITED">Exited</SelectItem>
              <SelectItem value="ALL">All statuses</SelectItem>
            </SelectContent>
          </Select>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="h-10 w-full sm:w-36" aria-label="Filter by role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {employees.length === 0 ? (
        <EmptyState icon={Users} title="No employees yet">
          <p className="mb-3">Add your first employee to start marking attendance.</p>
          <Button onClick={openAdd}>
            <Plus /> Add employee
          </Button>
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matching employees">
          Try a different search or filter.
        </EmptyState>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="pl-4">Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="pl-4">
                      <Link href={`/employees/${e.id}`} className="flex items-center gap-3 hover:underline">
                        <EmployeeAvatar name={e.full_name} url={e.photo_url} className="size-9" />
                        <span>
                          <span className="block font-medium">{e.full_name}</span>
                          <span className="block text-xs text-muted-foreground">{e.employee_code}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>{e.role}</TableCell>
                    <TableCell>{e.phone ?? "—"}</TableCell>
                    <TableCell>
                      {formatDate(e.join_date)}
                      {e.exit_date && (
                        <span className="block text-xs text-muted-foreground">Exited {formatDate(e.exit_date)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={e.status} />
                    </TableCell>
                    <TableCell>{actions(e)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <ul className="grid gap-2 md:hidden">
            {filtered.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <Link href={`/employees/${e.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <EmployeeAvatar name={e.full_name} url={e.photo_url} className="size-11" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{e.full_name}</p>
                      <StatusBadge status={e.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {e.employee_code} · {e.role}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.exit_date ? `Exited ${formatDate(e.exit_date)}` : `Joined ${formatDate(e.join_date)}`}
                    </p>
                  </div>
                </Link>
                {e.phone && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`tel:${e.phone}`} aria-label={`Call ${e.full_name}`}>
                      <Phone />
                    </a>
                  </Button>
                )}
                {actions(e)}
              </li>
            ))}
          </ul>
        </>
      )}

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} employee={editing} />
      <ExitDialog
        employee={exiting}
        joinDate={exiting?.join_date}
        onOpenChange={(o) => !o && setExiting(null)}
      />
      <RejoinDialog
        employee={rejoining}
        lastExitDate={rejoining?.exit_date}
        onOpenChange={(o) => !o && setRejoining(null)}
      />
    </>
  );
}
