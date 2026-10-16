import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Tent } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { getAdminStatus } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { isAdmin } = await getAdminStatus();
  if (isAdmin) redirect("/dashboard");

  const { error } = await searchParams;
  const initialError =
    error === "not_admin" ? "This account is not an admin. Log in with the admin account." : undefined;

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="absolute top-3 right-3">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Tent className="size-6" />
          </div>
          <CardTitle className="text-xl">{APP_NAME}</CardTitle>
          <CardDescription>Admin login</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm initialError={initialError} />
        </CardContent>
      </Card>
    </main>
  );
}
