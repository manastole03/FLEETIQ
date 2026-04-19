"use client";

import { clsx } from "clsx";

type Variant = "green" | "amber" | "red" | "blue" | "gray";

interface BadgeProps {
  variant: Variant;
  children: React.ReactNode;
  className?: string;
}

const styles: Record<Variant, string> = {
  green: "bg-[#14362a] text-[#55f0b1] border border-[#2dd99d]/35",
  amber: "bg-[#3b2d12] text-[#ffd479] border border-[#f4b84a]/35",
  red: "bg-[#3b171d] text-[#ff93a0] border border-[#ff5d6c]/35",
  blue: "bg-[#102f39] text-[#78e0ff] border border-[#53d7ff]/35",
  gray: "bg-[#17211d] text-[#a7bbb2] border border-white/10",
};

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
