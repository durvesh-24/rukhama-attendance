"use client";

import { useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addMonths, formatMonthLong } from "@/lib/dates";

/** Prev / next month switcher that writes ?month=YYYY-MM to the URL. */
export function MonthPicker({ month, max }: { month: string; max?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const go = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => go(addMonths(month, -1))}>
        <ChevronLeft />
      </Button>
      <div className="relative">
        <Button
          variant="ghost"
          className="min-w-36"
          onClick={() => {
            try {
              inputRef.current?.showPicker();
            } catch {
              inputRef.current?.focus();
            }
          }}
        >
          {formatMonthLong(month)}
        </Button>
        <input
          ref={inputRef}
          type="month"
          value={month}
          max={max}
          aria-label="Choose month"
          tabIndex={-1}
          onChange={(e) => e.target.value && go(e.target.value)}
          className="pointer-events-none absolute inset-0 opacity-0"
        />
      </div>
      <Button
        variant="outline"
        size="icon"
        aria-label="Next month"
        disabled={!!max && month >= max}
        onClick={() => go(addMonths(month, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
