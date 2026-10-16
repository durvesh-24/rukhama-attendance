import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function EmployeeAvatar({ name, url, className }: { name: string; url: string | null; className?: string }) {
  return (
    <Avatar className={cn("size-10", className)}>
      {url && <AvatarImage src={url} alt={name} className="object-cover" />}
      <AvatarFallback className="text-xs font-medium">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
