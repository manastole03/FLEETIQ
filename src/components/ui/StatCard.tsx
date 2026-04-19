"use client";

import { clsx } from "clsx";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  danger?: boolean;
}

export function StatCard({ label, value, sub, accent, danger }: StatCardProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d1210] p-4">
      <p className="mb-1 text-xs font-semibold uppercase text-[#8ea198]">
        {label}
      </p>
      <p
        className={clsx(
          "mono text-2xl font-bold",
          danger ? "text-[#ff5d6c]" : accent ? "text-[#26d69b]" : "text-white"
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-[#8ea198]">{sub}</p>}
    </div>
  );
}
