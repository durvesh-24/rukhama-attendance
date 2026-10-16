import Link from "next/link";
import { LogOut, Settings, Tent } from "lucide-react";
import { BottomNav, SidebarNav } from "@/components/app-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/app/login/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user } = await requireAdmin();

  return (
    <div className="flex min-h-dvh">
      {/* Laptop / desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-muted/30 p-4 md:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Tent className="size-5" />
          </span>
          <span className="text-sm leading-tight font-semibold">
            Rukhama Tent House
            <span className="block text-xs font-normal text-muted-foreground">Attendance</span>
          </span>
        </Link>
        <SidebarNav />
        <div className="mt-auto space-y-2 border-t pt-4">
          <p className="truncate px-2 text-xs text-muted-foreground" title={user.email}>
            {user.email}
          </p>
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <form action={logout}>
              <Button variant="ghost" size="sm" type="submit">
                <LogOut /> Log out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Tent className="size-4" />
            </span>
            Rukhama Attendance
          </Link>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/settings" aria-label="Settings">
                <Settings />
              </Link>
            </Button>
            <ThemeToggle />
            <form action={logout}>
              <Button variant="ghost" size="icon" type="submit" aria-label="Log out">
                <LogOut />
              </Button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-24 md:px-8 md:pt-8 md:pb-10">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
