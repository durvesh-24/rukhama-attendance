"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createEmployee, updateEmployee } from "@/app/(app)/employees/actions";
import { MAX_PHOTO_BYTES, PHOTO_TYPES, ROLES } from "@/lib/constants";
import { todayIST } from "@/lib/dates";
import type { EmployeeListItem } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** pass an employee to edit; omit to add a new one */
  employee?: EmployeeListItem | null;
};

export function EmployeeFormDialog({ open, onOpenChange, employee }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        {/* key resets the form state each time a different employee is opened */}
        {open && <EmployeeForm key={employee?.id ?? "new"} employee={employee} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EmployeeForm({ employee, onDone }: { employee?: EmployeeListItem | null; onDone: () => void }) {
  const router = useRouter();
  const isEdit = !!employee;
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(employee?.photo_url ?? null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      toast.error("Photo must be a JPG, PNG or WEBP image.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Photo must be smaller than 5 MB.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (removePhoto) formData.set("remove_photo", "1");
    startTransition(async () => {
      const result = isEdit ? await updateEmployee(formData) : await createEmployee(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.message) toast.warning(result.message);
      else toast.success(isEdit ? "Employee updated" : "Employee added");
      onDone();
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{isEdit ? `Edit ${employee.full_name}` : "Add employee"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? `${employee.employee_code} · Join and exit dates are changed from the employee's profile.`
            : "An employee code (RTH-xxxx) is created automatically."}
        </DialogDescription>
      </DialogHeader>

      {isEdit && <input type="hidden" name="id" value={employee.id} />}

      <div className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Employee photo" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <ImagePlus /> {preview ? "Change photo" : "Add photo (optional)"}
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPreview(null);
                setRemovePhoto(true);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              <X /> Remove photo
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            name="photo"
            accept={PHOTO_TYPES.join(",")}
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="full_name">Full name *</Label>
        <Input id="full_name" name="full_name" required maxLength={120} defaultValue={employee?.full_name} className="h-10" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" inputMode="tel" maxLength={20} defaultValue={employee?.phone ?? ""} className="h-10" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="role">Role *</Label>
          <Select name="role" defaultValue={employee?.role ?? "Labour"}>
            <SelectTrigger id="role" className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" name="address" maxLength={300} rows={2} defaultValue={employee?.address ?? ""} />
      </div>

      {!isEdit && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="join_date">Join date *</Label>
            <Input id="join_date" name="join_date" type="date" required defaultValue={todayIST()} className="h-10" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="join_description">Joining note</Label>
            <Textarea
              id="join_description"
              name="join_description"
              maxLength={500}
              rows={2}
              placeholder="e.g. Joined for wedding season, referred by Ramesh"
            />
          </div>
        </>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {isEdit ? "Save changes" : "Add employee"}
        </Button>
      </DialogFooter>
    </form>
  );
}
