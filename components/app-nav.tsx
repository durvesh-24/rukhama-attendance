"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, FileSpreadsheet, LayoutDashboard, Settings, UserSearch, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/attendance", label: "Attendance", short: "Attendance", icon: CalendarCheck },
  { href: "/employees", label: "Employees", short: "Employees", icon: Users },
  { href: "/employee-report", label: "Employee report", short: "Emp. report", icon: UserSearch },
  { href: "/reports", label: "All reports", short: "Reports", icon: FileSpreadsheet },
  { href: "/settings", label: "Settings", short: "Settings", icon: Settings },
] as const;

// Settings lives in the mobile top bar, so the bottom bar keeps 5 large targets
const BOTTOM_ITEMS = NAV_ITEMS.filter((i) => i.href !== "/settings");

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const isActive = useIsActive();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            isActive(href) && "bg-accent text-accent-foreground",
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const isActive = useIsActive();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {BOTTOM_ITEMS.map(({ href, short, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
                isActive(href) && "text-primary",
              )}
            >
              <Icon className={cn("size-5", isActive(href) && "stroke-[2.5]")} />
              {short}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
