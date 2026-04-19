"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Gauge,
  MapPinned,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface Load {
  id: string;
  loadNumber: string;
  status: string;
  originCity: string;
  originState: string;
  destCity: string;
  destState: string;
  rate: number;
  estimatedMiles: number;
  shipper: string;
  commodity: string;
  weight: number;
  pickupDate: string;
  deliveryDate: string;
  assignment: null | {
    driver: { name: string; truckNumber: string };
    estimatedNetMargin: number;
    marginPercent: number;
    status: string;
  };
}

interface Driver {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  hosRemaining: number;
  status: string;
  truckNumber: string;
  fuelLevel: number | null;
  onTimeRate: number;
  totalTrips: number;
}

interface ScoredDriver extends Driver {
  deadMiles: number;
  aiScore?: number;
  score?: number;
  hosScore: number;
  deadMileScore: number;
  onTimeScore: number;
  complianceScore: number;
  complianceStatus: "ok" | "warn" | "critical";
  complianceReason: string | null;
  reasoning: string;
  recommendation: "assign" | "marginal" | "skip";
  eligibleForDispatch?: boolean;
  dispatchBlockReasons?: string[];
  requiredHosHours?: number;
  recommendationRank?: number;
}

interface SmartDispatchProps {
  loads: Load[];
  initialDrivers: Driver[];
  onAssign: (
    driverId: string,
    loadId: string,
    score: number,
    reasoning: string
  ) => Promise<void>;
  onToast: (msg: string, type: "success" | "error" | "info") => void;
}

const fuelPrice = 4.2;
const mpg = 6.5;
const driverPayPerHour = 28;
const speedMph = 55;

export function SmartDispatch({
  loads,
  initialDrivers,
  onAssign,
  onToast,
}: SmartDispatchProps) {
  const firstPending = loads.find((load) => load.status === "PENDING");
  const [selectedLoadId, setSelectedLoadId] = useState<string>(
    firstPending?.id ?? loads[0]?.id ?? ""
  );
  const [query, setQuery] = useState("");
  const [scoredDrivers, setScoredDrivers] = useState<ScoredDriver[]>([]);
  const [scoring, setScoring] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  const selectedLoad = loads.find((load) => load.id === selectedLoadId);

  const filteredLoads = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return loads;
    return loads.filter((load) =>
      [
        load.loadNumber,
        load.originCity,
        load.originState,
        load.destCity,
        load.destState,
        load.shipper,
        String(load.rate),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [loads, query]);

  const availableDrivers = initialDrivers.filter(
    (driver) => driver.status === "AVAILABLE"
  );

  const fetchScores = useCallback(
    async (loadId: string) => {
      if (!loadId) return;
      setScoring(true);
      setScoredDrivers([]);
      try {
        const res = await fetch(`/api/drivers?loadId=${loadId}`);
        if (!res.ok) throw new Error("Driver scoring failed");
        const data = await res.json();
        setScoredDrivers(data.drivers ?? []);
      } catch {
        onToast("Failed to score drivers. Check API and demo database.", "error");
      } finally {
        setScoring(false);
      }
    },
    [onToast]
  );

  useEffect(() => {
    if (selectedLoadId && selectedLoad?.status === "PENDING") {
      fetchScores(selectedLoadId);
    } else {
      setScoredDrivers([]);
    }
  }, [fetchScores, selectedLoad?.status, selectedLoadId]);

  const qualifiedDrivers = scoredDrivers.filter((driver) => {
    if (driver.status !== "AVAILABLE") return false;
    if (typeof driver.eligibleForDispatch === "boolean") {
      return driver.eligibleForDispatch;
    }
    return driver.complianceStatus !== "critical" && driver.recommendation !== "skip";
  });
  const blockedDrivers = scoredDrivers.filter(
    (driver) => !qualifiedDrivers.some((item) => item.id === driver.id)
  );
  const topDriver = qualifiedDrivers[0];
  const selectedEconomics =
    selectedLoad && topDriver
      ? estimateEconomics(selectedLoad, topDriver.deadMiles)
      : selectedLoad
        ? estimateEconomics(selectedLoad, 0)
        : null;

  const handleAssign = async (driver: ScoredDriver) => {
    if (!selectedLoad) return;
    setAssigning(driver.id);
    try {
      await onAssign(
        driver.id,
        selectedLoad.id,
        getScore(driver),
        driver.reasoning
      );
      onToast(
        `Load ${selectedLoad.loadNumber} assigned to ${driver.name}. Driver notification is ready.`,
        "success"
      );
      setScoredDrivers((prev) =>
        prev.map((item) =>
          item.id === driver.id ? { ...item, status: "ON_TRIP" } : item
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Assignment failed";
      onToast(msg, "error");
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="fade-in grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="panel p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-white">Load Queue</p>
            <p className="mt-1 text-xs text-[#8ea198]">
              Select a pending rate confirmation.
            </p>
          </div>
          <Badge variant="blue">{loads.length} loads</Badge>
        </div>

        <label className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-[#070908] px-3 py-2.5">
          <Search className="h-4 w-4 text-[#8ea198]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search lane, shipper, rate"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-white outline-none placeholder:text-[#64776e]"
          />
        </label>

        <div className="mt-4 grid max-h-[690px] gap-3 overflow-y-auto pr-1">
          {filteredLoads.map((load) => (
            <LoadCard
              key={load.id}
              load={load}
              selected={load.id === selectedLoadId}
              onSelect={() => load.status === "PENDING" && setSelectedLoadId(load.id)}
            />
          ))}
        </div>
      </aside>

      <section className="grid min-w-0 gap-4">
        <div className="panel p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-white">Driver Recommendations</p>
              <p className="mt-1 text-xs text-[#8ea198]">
                Grok explanation plus deterministic HOS, cost, deadhead, and compliance scoring.
              </p>
            </div>
            <button
              onClick={() => selectedLoad && fetchScores(selectedLoad.id)}
              disabled={scoring || !selectedLoad || selectedLoad.status !== "PENDING"}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#111a16] px-3 py-2 text-sm font-black text-white transition hover:border-[#26d69b]/45 disabled:opacity-50"
            >
              <RefreshCw className={clsx("h-4 w-4", scoring && "spin-ring")} />
              Re-score
            </button>
          </div>

          {scoring ? (
            <ScoringLoader loadNumber={selectedLoad?.loadNumber} />
          ) : selectedLoad?.status !== "PENDING" ? (
            <EmptyState
              title="Load already assigned"
              text="Select a pending load to run a new recommendation."
            />
          ) : qualifiedDrivers.length === 0 ? (
            <EmptyState
              title="No matches yet"
              text="Select a load or refresh scores to rank available drivers."
            />
          ) : (
            <div className="mt-4 grid gap-3">
              {qualifiedDrivers.slice(0, 5).map((driver, index) => (
                <DriverRecommendation
                  key={driver.id}
                  driver={driver}
                  load={selectedLoad}
                  top={index === 0}
                  assigning={assigning === driver.id}
                  onAssign={() => handleAssign(driver)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.05fr)_390px]">
          <RouteBoard
            selectedLoad={selectedLoad}
            topDriver={topDriver}
            availableDrivers={availableDrivers}
          />
          <LoadIntelligence
            selectedLoad={selectedLoad}
            topDriver={topDriver}
            economics={selectedEconomics}
          />
        </div>

        <BlockedDrivers blockedDrivers={blockedDrivers} />
      </section>
    </div>
  );
}

function LoadCard({
  load,
  selected,
  onSelect,
}: {
  load: Load;
  selected: boolean;
  onSelect: () => void;
}) {
  const disabled = load.status !== "PENDING";
  return (
    <button
      onClick={onSelect}
      className={clsx(
        "premium-card rounded-lg border p-4 text-left",
        selected
          ? "border-[#26d69b]/55 bg-[#13271f]"
          : "border-white/10 bg-[#0d1210] hover:border-[#26d69b]/35",
        disabled && "opacity-55"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mono text-xs font-black text-[#8ea198]">
            {load.loadNumber}
          </p>
          <p className="mt-1 text-base font-black text-white">
            {load.originCity}, {load.originState}
          </p>
          <p className="text-sm font-bold text-[#8ea198]">
            to {load.destCity}, {load.destState}
          </p>
        </div>
        <StatusBadge status={load.status} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <Metric label="Rate" value={`$${load.rate.toLocaleString()}`} />
        <Metric label="Miles" value={Math.round(load.estimatedMiles).toLocaleString()} />
        <Metric label="Shipper" value={load.shipper} />
        <Metric label="Pickup" value={formatShortDate(load.pickupDate)} />
      </div>
    </button>
  );
}

function DriverRecommendation({
  driver,
  load,
  top,
  assigning,
  onAssign,
}: {
  driver: ScoredDriver;
  load: Load;
  top: boolean;
  assigning: boolean;
  onAssign: () => void;
}) {
  const score = getScore(driver);
  const economics = estimateEconomics(load, driver.deadMiles);
  const scoreTone =
    score >= 82 ? "text-[#26d69b]" : score >= 64 ? "text-[#f4b84a]" : "text-[#ff5d6c]";
  const scoreBar =
    score >= 82 ? "bg-[#26d69b]" : score >= 64 ? "bg-[#f4b84a]" : "bg-[#ff5d6c]";

  return (
    <article
      className={clsx(
        "premium-card rounded-lg border p-4",
        top ? "border-[#26d69b]/55 bg-[#102019]" : "border-white/10 bg-[#0d1210]"
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(210px,0.9fr)_1.25fr_auto] lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#050706] text-sm font-black text-white ring-1 ring-white/10">
            {initials(driver.name)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-black text-white">{driver.name}</p>
              {top ? <Badge variant="green">Best fit</Badge> : null}
            </div>
            <p className="mt-1 text-xs font-semibold text-[#8ea198]">
              {driver.truckNumber} - {driver.city}, {driver.state}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MiniMetric label="HOS" value={`${driver.hosRemaining}h`} />
          <MiniMetric label="Deadhead" value={`${driver.deadMiles} mi`} />
          <MiniMetric label="Margin" value={`$${economics.netMargin.toLocaleString()}`} />
          <MiniMetric label="On-time" value={`${(driver.onTimeRate * 100).toFixed(0)}%`} />
        </div>

        <div className="flex items-center justify-between gap-4 lg:justify-end">
          <div className="w-28">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#8ea198]">Score</span>
              <span className={clsx("mono text-lg font-black", scoreTone)}>
                {score}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-lg bg-white/10">
              <div
                className={clsx("score-fill h-full rounded-lg", scoreBar)}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
          <button
            onClick={onAssign}
            disabled={assigning}
            className="rounded-lg bg-[#26d69b] px-4 py-2.5 text-sm font-black text-[#03120c] transition hover:bg-[#55f0b1] disabled:opacity-50"
          >
            {assigning ? "Assigning" : "Assign"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <p className="text-sm leading-6 text-[#b8c8c0]">{driver.reasoning}</p>
        <Badge variant={driver.complianceStatus === "ok" ? "green" : "amber"}>
          {driver.complianceStatus === "ok" ? "Compliance clear" : "Review guardrail"}
        </Badge>
      </div>
    </article>
  );
}

function RouteBoard({
  selectedLoad,
  topDriver,
  availableDrivers,
}: {
  selectedLoad: Load | undefined;
  topDriver: ScoredDriver | undefined;
  availableDrivers: Driver[];
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-white">Route Command Map</p>
          <p className="mt-1 text-xs text-[#8ea198]">
            Driver positions, pickup lane, and trip guardrails.
          </p>
        </div>
        <MapPinned className="h-5 w-5 text-[#26d69b]" />
      </div>
      <div className="soft-grid relative mt-4 h-[310px] overflow-hidden rounded-lg border border-white/10 bg-[#0a0f0d]">
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 600 320"
          preserveAspectRatio="none"
        >
          <path
            d="M58 242 C150 125 245 258 334 150 C423 42 486 145 542 74"
            fill="none"
            stroke="rgba(218,255,237,0.12)"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M58 242 C150 125 245 258 334 150 C423 42 486 145 542 74"
            fill="none"
            stroke="#26d69b"
            strokeWidth="5"
            strokeLinecap="round"
            className="route-dash"
          />
        </svg>

        {[
          { left: "12%", top: "67%", label: selectedLoad?.originCity ?? "Origin" },
          { left: "84%", top: "19%", label: selectedLoad?.destCity ?? "Destination" },
        ].map((pin, index) => (
          <div
            key={pin.label}
            className="absolute"
            style={{ left: pin.left, top: pin.top }}
          >
            <div
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-lg text-[#03120c] shadow-md",
                index === 0 ? "bg-[#26d69b]" : "bg-[#53d7ff]"
              )}
            >
              <MapPinned className="h-5 w-5" />
            </div>
            <p className="mt-1 rounded-md border border-white/10 bg-[#0d1210] px-2 py-1 text-xs font-black text-white">
              {pin.label}
            </p>
          </div>
        ))}

        {availableDrivers.slice(0, 6).map((driver, index) => {
          const coords = [
            ["23%", "47%"],
            ["35%", "73%"],
            ["48%", "38%"],
            ["60%", "62%"],
            ["70%", "34%"],
            ["78%", "76%"],
          ][index] ?? ["50%", "50%"];
          const isTop = topDriver?.id === driver.id;
          return (
            <div
              key={driver.id}
              className="absolute"
              style={{ left: coords[0], top: coords[1] }}
            >
              <div
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-lg border bg-[#0d1210] shadow",
                  isTop
                    ? "border-[#26d69b] text-[#26d69b]"
                    : "border-white/16 text-[#8ea198]"
                )}
              >
                <Truck className="h-4 w-4" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <RouteStat icon={Clock3} label="Pickup ETA" value={topDriver ? `${Math.max(28, topDriver.deadMiles)} min` : "Pending"} />
        <RouteStat icon={Gauge} label="HOS buffer" value={topDriver ? `${Math.max(0, topDriver.hosRemaining - 6.5).toFixed(1)}h` : "Pending"} />
        <RouteStat icon={Route} label="Route miles" value={selectedLoad ? `${Math.round(selectedLoad.estimatedMiles)}` : "Pending"} />
      </div>
    </div>
  );
}

function LoadIntelligence({
  selectedLoad,
  topDriver,
  economics,
}: {
  selectedLoad: Load | undefined;
  topDriver: ScoredDriver | undefined;
  economics: ReturnType<typeof estimateEconomics> | null;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-white">Load Intelligence</p>
          <p className="mt-1 text-xs text-[#8ea198]">Cost and compliance summary.</p>
        </div>
        <CircleDollarSign className="h-5 w-5 text-[#26d69b]" />
      </div>

      {selectedLoad ? (
        <div className="mt-4 grid gap-4">
          <div className="panel-soft p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mono text-xs font-black text-[#8ea198]">
                  {selectedLoad.loadNumber}
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  {selectedLoad.originCity} to {selectedLoad.destCity}
                </h2>
              </div>
              <StatusBadge status={selectedLoad.status} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="Revenue" value={`$${selectedLoad.rate.toLocaleString()}`} />
              <Metric label="Loaded miles" value={Math.round(selectedLoad.estimatedMiles).toLocaleString()} />
              <Metric label="Commodity" value={selectedLoad.commodity} />
              <Metric label="Weight" value={`${Math.round(selectedLoad.weight).toLocaleString()} lb`} />
            </div>
          </div>

          {economics ? (
            <div className="panel-soft p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-[#8ea198]">
                    Net margin
                  </p>
                  <p
                    className={clsx(
                      "mono mt-2 text-3xl font-black",
                      economics.netMargin >= 0 ? "text-[#26d69b]" : "text-[#ff5d6c]"
                    )}
                  >
                    ${economics.netMargin.toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#8ea198]">
                    {economics.marginPercent.toFixed(1)}% margin
                  </p>
                </div>
                <Badge
                  variant={
                    economics.verdict === "Accept"
                      ? "green"
                      : economics.verdict === "Review"
                        ? "amber"
                        : "red"
                  }
                >
                  {economics.verdict}
                </Badge>
              </div>
            </div>
          ) : null}

          <div className="grid gap-2">
            <CheckItem
              label="HOS fit"
              ok={Boolean(topDriver && topDriver.complianceStatus !== "critical")}
              text={
                topDriver
                  ? `${topDriver.hosRemaining}h available for first legal drive window`
                  : "Run scoring to evaluate HOS"
              }
            />
            <CheckItem label="Truck route" ok={Boolean(topDriver)} text="Bridge, weight, and route guardrails checked." />
            <CheckItem
              label="Weight risk"
              ok={selectedLoad.weight <= 43000}
              text={selectedLoad.weight <= 43000 ? "Inside demo threshold." : "Review axle profile."}
            />
          </div>
        </div>
      ) : (
        <EmptyState title="No load selected" text="Choose a load to evaluate." />
      )}
    </div>
  );
}

function BlockedDrivers({ blockedDrivers }: { blockedDrivers: ScoredDriver[] }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-white">Guardrail Rejections</p>
          <p className="mt-1 text-xs text-[#8ea198]">
            Drivers removed from the final recommendation list.
          </p>
        </div>
        <ShieldCheck className="h-5 w-5 text-[#26d69b]" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {blockedDrivers.length === 0 ? (
          <div className="flex items-start gap-3 rounded-lg border border-[#26d69b]/24 bg-[#102019] p-3 text-sm text-[#b8c8c0]">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#26d69b]" />
            All scored drivers passed hard compliance checks.
          </div>
        ) : (
          blockedDrivers.slice(0, 3).map((driver) => (
            <div key={driver.id} className="rounded-lg border border-white/10 bg-[#0d1210] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-black text-white">{driver.name}</p>
                <Badge variant={driver.complianceStatus === "critical" ? "red" : "amber"}>
                  {driver.status === "AVAILABLE" ? driver.complianceStatus : driver.status}
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#8ea198]">
                {driver.dispatchBlockReasons?.[0] ??
                  driver.complianceReason ??
                  "Driver is not available for dispatch right now."}
              </p>
              {driver.dispatchBlockReasons && driver.dispatchBlockReasons.length > 1 ? (
                <p className="mt-2 text-[11px] leading-5 text-[#64776e]">
                  +{driver.dispatchBlockReasons.length - 1} more guardrail reason(s)
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ScoringLoader({ loadNumber }: { loadNumber?: string }) {
  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-[#070908] p-8 text-center">
      <div className="mx-auto h-10 w-10 rounded-full border-4 border-white/10 border-t-[#26d69b] spin-ring" />
      <p className="mt-4 text-sm font-black text-white">
        Scoring drivers against {loadNumber ?? "selected load"}
      </p>
      <p className="mt-1 text-xs text-[#8ea198]">
        Checking HOS, deadhead, route fit, margin, and compliance.
      </p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-[#070908] p-8 text-center">
      <XCircle className="mx-auto h-8 w-8 text-[#8ea198]" />
      <p className="mt-3 font-black text-white">{title}</p>
      <p className="mt-1 text-sm text-[#8ea198]">{text}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PENDING") return <Badge variant="blue">Pending</Badge>;
  if (status === "ASSIGNED" || status === "IN_TRANSIT") {
    return <Badge variant="green">Assigned</Badge>;
  }
  return <Badge variant="gray">{status}</Badge>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase text-[#8ea198]">{label}</p>
      <p className="mt-1 truncate font-black text-white">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#070908] p-3">
      <p className="text-[11px] font-black uppercase text-[#8ea198]">{label}</p>
      <p className="mono mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function RouteStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d1210] p-3">
      <Icon className="h-4 w-4 text-[#26d69b]" />
      <p className="mt-2 text-xs text-[#8ea198]">{label}</p>
      <p className="mono mt-1 font-black text-white">{value}</p>
    </div>
  );
}

function CheckItem({
  label,
  ok,
  text,
}: {
  label: string;
  ok: boolean;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#0d1210] p-3">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#26d69b]" />
      ) : (
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#f4b84a]" />
      )}
      <div>
        <p className="font-black text-white">{label}</p>
        <p className="text-xs leading-5 text-[#8ea198]">{text}</p>
      </div>
    </div>
  );
}

function estimateEconomics(load: Load, deadMiles: number) {
  const fuelCost = Math.round((load.estimatedMiles / mpg) * fuelPrice);
  const deadheadFuelCost = Math.round((deadMiles / mpg) * fuelPrice);
  const driverPay = Math.round((load.estimatedMiles / speedMph) * driverPayPerHour);
  const tolls = Math.round(load.estimatedMiles * 0.06);
  const netMargin =
    Math.round(load.rate - fuelCost - deadheadFuelCost - driverPay - tolls);
  const marginPercent = load.rate > 0 ? (netMargin / load.rate) * 100 : 0;
  const verdict =
    marginPercent >= 25 ? "Accept" : marginPercent >= 12 ? "Review" : "Reject";
  return {
    fuelCost,
    deadheadFuelCost,
    driverPay,
    tolls,
    netMargin,
    marginPercent,
    verdict,
  };
}

function getScore(driver: ScoredDriver) {
  return Math.round(driver.aiScore ?? driver.score ?? 0);
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
