"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  ClipboardList,
  CircleDollarSign,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  MapPinned,
  RadioTower,
  ShieldCheck,
  TrendingUp,
  Truck,
} from "lucide-react";
import { SmartDispatch } from "@/components/SmartDispatch";
import { CostIntelligence } from "@/components/CostIntelligence";
import { AlertsPanel } from "@/components/AlertsPanel";
import { ProfitabilityPredictor } from "@/components/ProfitabilityPredictor";
import { DispatchCopilot } from "@/components/DispatchCopilot";
import { DocumentsIntelligencePanel } from "@/components/DocumentsIntelligencePanel";
import { AssignmentQueue } from "@/components/AssignmentQueue";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import type { DemoSession } from "@/lib/demo-auth";

type Tab = "dispatch" | "queue" | "profit" | "copilot" | "cost" | "docs" | "alerts";
type IconComponent = typeof Truck;

interface DashboardClientProps {
  initialLoads: any[];
  initialDrivers: any[];
  initialAlerts: any[];
  initialStats: {
    availableDrivers: number;
    totalDrivers: number;
    pendingLoads: number;
    activeTrips: number;
    hosAlerts: number;
  };
  currentUser: DemoSession | null;
}

const tabs: { id: Tab; label: string; sub: string; icon: IconComponent }[] = [
  { id: "dispatch", label: "Smart Dispatch", sub: "Load matching", icon: LayoutDashboard },
  { id: "queue", label: "Assignment Queue", sub: "Requests and responses", icon: ClipboardList },
  { id: "profit", label: "Profitability", sub: "Accept / review / reject", icon: TrendingUp },
  { id: "copilot", label: "AI Copilot", sub: "Operational assistant", icon: Bot },
  { id: "cost", label: "Cost Lab", sub: "Margin simulator", icon: CircleDollarSign },
  { id: "docs", label: "Documents", sub: "Billing readiness", icon: FileCheck2 },
  { id: "alerts", label: "Compliance", sub: "HOS and route risk", icon: ShieldCheck },
];

export function DashboardClient({
  initialLoads,
  initialDrivers,
  initialAlerts,
  initialStats,
  currentUser,
}: DashboardClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dispatch");
  const [loads, setLoads] = useState(initialLoads);
  const [drivers, setDrivers] = useState(initialDrivers);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [stats, setStats] = useState(initialStats);
  const { toasts, addToast, dismiss } = useToast();

  const activeRevenue = useMemo(
    () =>
      loads
        .filter(
          (load) =>
            load.status === "ACCEPTED" ||
            load.status === "ASSIGNED" ||
            load.status === "IN_TRANSIT"
        )
        .reduce((sum, load) => sum + Number(load.rate || 0), 0),
    [loads]
  );

  const activeTab = tabs.find((item) => item.id === tab) ?? tabs[0];

  const handleAssign = useCallback(
    async (
      driverId: string,
      loadId: string,
      aiScore: number,
      aiReasoning: string
    ) => {
      const res = await fetch("/api/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId, loadId, aiScore, aiReasoning }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? err.error ?? "Assignment failed");
      }

      setLoads((prev) =>
        prev.map((load) =>
          load.id === loadId ? { ...load, status: "PENDING_RESPONSE" } : load
        )
      );
      setStats((prev) => ({
        ...prev,
      }));
    },
    []
  );

  const handleResolveAlert = useCallback(
    async (alertId: string) => {
      try {
        await fetch("/api/alerts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alertId }),
        });
        setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
        setStats((prev) => ({
          ...prev,
          hosAlerts: Math.max(0, prev.hosAlerts - 1),
        }));
        addToast("Alert resolved", "info");
      } catch {
        addToast("Failed to resolve alert", "error");
      }
    },
    [addToast]
  );

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login/admin");
    router.refresh();
  }, [router]);

  return (
    <div className="app-bg min-h-screen text-white">
      <div className="lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="hidden h-screen border-r border-white/10 bg-[#070908]/95 lg:sticky lg:top-0 lg:flex lg:flex-col">
          <div className="border-b border-white/10 p-5">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#26d69b] text-[#03120c] shadow-lg">
                <Truck className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-lg font-black">FleetIQ</span>
                <span className="block text-xs font-semibold text-[#8ea198]">
                  NavPro intelligence
                </span>
              </span>
            </Link>
          </div>

          <nav className="grid gap-2 p-4">
            {tabs.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition",
                    active
                      ? "border-[#26d69b]/55 bg-[#13271f] text-white"
                      : "border-transparent text-[#8ea198] hover:border-white/10 hover:bg-[#111a16] hover:text-white"
                  )}
                >
                  <span
                    className={clsx(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      active ? "bg-[#26d69b] text-[#03120c]" : "bg-[#111a16]"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black">{item.label}</span>
                    <span className="block text-xs font-semibold opacity-75">
                      {item.sub}
                    </span>
                  </span>
                  {item.id === "alerts" && stats.hosAlerts > 0 ? (
                    <span className="rounded-md bg-[#ff5d6c] px-2 py-1 text-xs font-black text-white">
                      {stats.hosAlerts}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto p-4">
            <div className="rounded-lg border border-white/10 bg-[#0d1210] p-4">
              <div className="flex items-center gap-2 text-sm font-black">
                <RadioTower className="h-4 w-4 text-[#26d69b]" />
                NavPro Sync
              </div>
              <p className="mt-3 text-xs leading-5 text-[#8ea198]">
                Driver readiness, route risk, and cost intelligence are flowing
                into dispatch.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold">
                <span className="h-2 w-2 rounded-full bg-[#26d69b] live-dot" />
                {stats.availableDrivers}/{stats.totalDrivers} drivers ready
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-white/10 bg-[#0d1210] p-4">
              <p className="text-sm font-black">{currentUser?.name ?? "Admin"}</p>
              <p className="mt-1 text-xs font-semibold text-[#8ea198]">
                {currentUser?.role ?? "Admin"} - {currentUser?.metadata.fleet ?? "FleetIQ Demo"}
              </p>
              <button
                onClick={handleLogout}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#111a16] px-3 py-2 text-sm font-black hover:border-[#ff5d6c]/45 hover:text-[#ff93a0]"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070908]/88 backdrop-blur">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  href="/"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#26d69b] text-[#03120c] lg:hidden"
                >
                  <Truck className="h-5 w-5" />
                </Link>
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#26d69b]">
                    {activeTab.sub}
                  </p>
                  <h1 className="truncate text-lg font-black sm:text-xl">
                    {activeTab.label}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-[#0d1210] px-3 py-2 text-xs font-semibold text-[#8ea198] sm:flex">
                  <span className="h-2 w-2 rounded-full bg-[#26d69b] live-dot" />
                  Live fleet data
                </div>
                <Link
                  href="/login/driver"
                  className="hidden rounded-lg bg-white px-3 py-2 text-sm font-black text-[#070908] transition hover:bg-[#dfffee] sm:inline-flex"
                >
                  Driver Login
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#111a16] px-3 py-2 text-sm font-black text-white hover:border-[#ff5d6c]/45"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>

            <div className="flex gap-1 overflow-x-auto border-t border-white/10 px-4 py-2 lg:hidden">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={clsx(
                    "shrink-0 rounded-lg px-3 py-2 text-sm font-black",
                    tab === item.id
                      ? "bg-[#26d69b] text-[#03120c]"
                      : "bg-[#111a16] text-[#8ea198]"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </header>

          <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
            <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="panel p-5">
                <p className="text-sm font-black text-[#26d69b]">
                  Dispatcher command center
                </p>
                <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-3xl font-black leading-tight">
                      Welcome back, {currentUser?.name ?? "operator"}.
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8ea198]">
                      Select a load, score eligible drivers, validate HOS and
                      route risk, then send the job to the driver app.
                    </p>
                  </div>
                  <Link
                    href="/login/driver"
                    className="inline-flex items-center justify-center rounded-lg bg-[#26d69b] px-4 py-3 text-sm font-black text-[#03120c] transition hover:bg-[#55f0b1]"
                  >
                    Open Driver Login
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Kpi icon={MapPinned} label="Pending loads" value={stats.pendingLoads} sub="ready for scoring" />
                <Kpi icon={Truck} label="Drivers ready" value={stats.availableDrivers} sub={`of ${stats.totalDrivers} on shift`} />
                <Kpi icon={BarChart3} label="Active revenue" value={`$${activeRevenue.toLocaleString()}`} sub={`${stats.activeTrips} active trips`} />
                <Kpi icon={AlertTriangle} label="HOS flags" value={stats.hosAlerts} sub="guardrails active" danger={stats.hosAlerts > 0} />
              </div>
            </section>

            <section className="mt-6">
              {tab === "dispatch" ? (
                <SmartDispatch
                  loads={loads}
                  initialDrivers={drivers}
                  onAssign={handleAssign}
                  onToast={addToast}
                />
              ) : null}
              {tab === "queue" ? (
                <AssignmentQueue drivers={drivers} onToast={addToast} />
              ) : null}
              {tab === "profit" ? (
                <ProfitabilityPredictor loads={loads} drivers={drivers} />
              ) : null}
              {tab === "copilot" ? (
                <DispatchCopilot
                  loads={loads}
                  drivers={drivers}
                  alerts={alerts}
                  onOpenProfitability={() => setTab("profit")}
                  onOpenDispatch={() => setTab("dispatch")}
                  onOpenAlerts={() => setTab("alerts")}
                />
              ) : null}
              {tab === "cost" ? <CostIntelligence /> : null}
              {tab === "docs" ? <DocumentsIntelligencePanel loads={loads} /> : null}
              {tab === "alerts" ? (
                <AlertsPanel alerts={alerts} onResolve={handleResolveAlert} />
              ) : null}
            </section>
          </main>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  danger,
}: {
  icon: IconComponent;
  label: string;
  value: string | number;
  sub: string;
  danger?: boolean;
}) {
  return (
    <div className="premium-card rounded-lg border border-white/10 bg-[#0d1210] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-[#8ea198]">{label}</p>
          <p
            className={clsx(
              "mono mt-2 text-2xl font-black",
              danger ? "text-[#ff5d6c]" : "text-white"
            )}
          >
            {value}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#8ea198]">{sub}</p>
        </div>
        <span
          className={clsx(
            "flex h-11 w-11 items-center justify-center rounded-lg",
            danger ? "bg-[#3b171d] text-[#ff5d6c]" : "bg-[#14362a] text-[#26d69b]"
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
