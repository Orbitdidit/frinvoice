import React from "react";
import { cn } from "@/lib/utils";

const STAMP_STYLES = {
  draft: "border-ink text-ink bg-ink/5",
  sent: "border-[#d9a441] text-[#a97b1e] bg-[#d9a441]/10",
  viewed: "border-[#2456d6] text-[#2456d6] bg-[#2456d6]/10",
  paid: "border-money text-money bg-money/10",
  overdue: "border-stamp text-stamp bg-stamp/10 stamp-pulse",
  cancelled: "border-slate-400 text-slate-400 bg-slate-50",
  accepted: "border-money text-money bg-money/10",
  declined: "border-stamp text-stamp bg-stamp/10",
};

export default function StampBadge({ status, className, rotate = true }) {
  const cls = STAMP_STYLES[status] || STAMP_STYLES.draft;
  return (
    <span
      className={cn(
        "stamp anim-stamp inline-flex items-center justify-center border-2 px-2 py-1 text-[10px] rounded-md",
        cls,
        rotate && "rotate-[-4deg]",
        className
      )}
    >
      {status}
    </span>
  );
}