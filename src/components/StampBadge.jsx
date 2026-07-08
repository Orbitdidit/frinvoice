import React from "react";
import { cn } from "@/lib/utils";

const STAMP_STYLES = {
  draft: "border-slate-500 text-slate-600 bg-slate-50",
  sent: "border-ink text-ink bg-paper",
  viewed: "border-ink text-ink bg-paper",
  paid: "border-money text-money bg-money/10",
  overdue: "border-stamp text-stamp bg-stamp/10",
  cancelled: "border-slate-400 text-slate-400 bg-slate-50",
  accepted: "border-money text-money bg-money/10",
  declined: "border-stamp text-stamp bg-stamp/10",
};

export default function StampBadge({ status, className, rotate = true }) {
  const cls = STAMP_STYLES[status] || STAMP_STYLES.draft;
  return (
    <span
      className={cn(
        "stamp inline-flex items-center justify-center border-2 px-2 py-1 text-[10px] rounded-md",
        cls,
        rotate && "rotate-[-4deg]",
        className
      )}
    >
      {status}
    </span>
  );
}