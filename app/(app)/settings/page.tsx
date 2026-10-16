import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, user } = await requireAdmin();
  const { data: admin } = await supabase.from("admins").select("name, created_at").eq("user_id", user.id).maybeSingle();

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid max-w-xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Logged in as admin</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm">
            <p>
              <span className="text-muted-foreground">Name:</span> {admin?.name ?? "Admin"}
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span> {user.email}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Use at least 8 characters.</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
