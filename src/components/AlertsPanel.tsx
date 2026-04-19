"use client";

import { clsx } from "clsx";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  resolved: boolean;
  driver: { name: string; truckNumber: string } | null;
  load: { loadNumber: string } | null;
  createdAt: string;
}

interface AlertsPanelProps {
  alerts: Alert[];
  onResolve: (alertId: string) => void;
}

export function AlertsPanel({ alerts, onResolve }: AlertsPanelProps) {
  const critical = alerts.filter((alert) => alert.severity === "CRITICAL");
  const warnings = alerts.filter((alert) => alert.severity !== "CRITICAL");

  if (alerts.length === 0) {
    return (
      <div className="fade-in panel p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-[#14362a] text-[#26d69b]">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-black text-white">No active compliance alerts</h2>
        <p className="mt-2 text-sm text-[#8ea198]">
          HOS, route, and truck profile guardrails are clear.
        </p>
      </div>
    );
  }

  return (
    <div className="fade-in grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
      <section className="panel p-5">
        <p className="text-sm font-black text-white">Compliance Control</p>
        <p className="mt-2 text-sm leading-6 text-[#8ea198]">
          Resolve operational risks before assignments move to the driver.
        </p>

        <div className="mt-5 grid gap-3">
          <SummaryCard label="Critical" value={critical.length} tone="red" text="Hard assignment blocks." />
          <SummaryCard label="Warnings" value={warnings.length} tone="yellow" text="Review before dispatch." />
          <SummaryCard label="Open alerts" value={alerts.length} tone="green" text="Active guardrail events." />
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-white">Active Alerts</p>
            <p className="mt-1 text-xs text-[#8ea198]">
              HOS and safety exceptions generated from demo fleet data.
            </p>
          </div>
          <Badge variant="red">{alerts.length} open</Badge>
        </div>

        <div className="mt-5 grid gap-3">
          {alerts.map((alert) => {
            const criticalAlert = alert.severity === "CRITICAL";
            return (
              <article
                key={alert.id}
                className={clsx(
                  "rounded-lg border p-4",
                  criticalAlert
                    ? "border-[#ff5d6c]/30 bg-[#211015]"
                    : "border-[#f4b84a]/30 bg-[#211b10]"
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <div
                      className={clsx(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                        criticalAlert
                          ? "bg-[#3b171d] text-[#ff5d6c]"
                          : "bg-[#3b2d12] text-[#f4b84a]"
                      )}
                    >
                      {criticalAlert ? (
                        <ShieldAlert className="h-5 w-5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-white">{alert.title}</h3>
                        <Badge variant={criticalAlert ? "red" : "amber"}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#b8c8c0]">
                        {alert.message}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#8ea198]">
                        {alert.driver ? (
                          <span className="rounded-md border border-white/10 bg-[#0d1210] px-2 py-1">
                            {alert.driver.name} - {alert.driver.truckNumber}
                          </span>
                        ) : null}
                        {alert.load ? (
                          <span className="rounded-md border border-white/10 bg-[#0d1210] px-2 py-1">
                            {alert.load.loadNumber}
                          </span>
                        ) : null}
                        <span className="rounded-md border border-white/10 bg-[#0d1210] px-2 py-1">
                          {new Date(alert.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onResolve(alert.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#26d69b] px-3 py-2 text-sm font-black text-[#03120c] hover:bg-[#55f0b1]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Resolve
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  text,
  tone,
}: {
  label: string;
  value: number;
  text: string;
  tone: "red" | "yellow" | "green";
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d1210] p-4">
      <p className="text-xs font-black uppercase text-[#8ea198]">{label}</p>
      <p
        className={clsx(
          "mono mt-2 text-3xl font-black",
          tone === "red" && "text-[#ff5d6c]",
          tone === "yellow" && "text-[#f4b84a]",
          tone === "green" && "text-[#26d69b]"
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-[#8ea198]">{text}</p>
    </div>
  );
}
