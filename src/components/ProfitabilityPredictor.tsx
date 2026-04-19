"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CircleDollarSign,
  Fuel,
  Gauge,
  MapPinned,
  ReceiptText,
  Route,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  buildDriverProfitability,
  getMarketOutcomeScenarios,
  type DriverProfitability,
  type IntelligenceDriver,
  type IntelligenceLoad,
  type ProfitabilityResult,
} from "@/lib/intelligence";

interface ProfitabilityPredictorProps {
  loads: IntelligenceLoad[];
  drivers: IntelligenceDriver[];
}

export function ProfitabilityPredictor({
  loads,
  drivers,
}: ProfitabilityPredictorProps) {
  const pendingLoads = loads.filter((load) => load.status === "PENDING");
  const [selectedLoadId, setSelectedLoadId] = useState(
    pendingLoads[0]?.id ?? loads[0]?.id ?? ""
  );

  const selectedLoad =
    loads.find((load) => load.id === selectedLoadId) ?? pendingLoads[0] ?? loads[0];

  const comparisons = useMemo(
    () => (selectedLoad ? buildDriverProfitability(selectedLoad, drivers) : []),
    [drivers, selectedLoad]
  );
  const best = comparisons[0];
  const scenarios = useMemo(() => getMarketOutcomeScenarios(loads), [loads]);

  if (!selectedLoad || loads.length === 0) {
    return (
      <div className="fade-in panel p-8 text-center">
        <CircleDollarSign className="mx-auto h-8 w-8 text-[#8ea198]" />
        <h2 className="mt-3 text-xl font-black text-white">No loads available</h2>
        <p className="mt-2 text-sm text-[#8ea198]">
          Add or seed load records to run profitability predictions.
        </p>
      </div>
    );
  }

  return (
    <div className="fade-in grid gap-4 2xl:grid-cols-[minmax(0,1.2fr)_420px]">
      <section className="grid min-w-0 gap-4">
        <div className="panel p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black text-[#26d69b]">
                Profitability Predictor
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Evaluate margin before dispatch.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8ea198]">
                Compare the same rate confirmation across available drivers,
                including deadhead, fuel, driver cost, tolls, and margin buffer.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[430px]">
              {loads.slice(0, 3).map((load) => (
                <button
                  key={load.id}
                  onClick={() => setSelectedLoadId(load.id)}
                  className={clsx(
                    "rounded-lg border p-3 text-left transition",
                    selectedLoad.id === load.id
                      ? "border-[#26d69b]/55 bg-[#13271f]"
                      : "border-white/10 bg-[#0d1210] hover:border-[#26d69b]/35"
                  )}
                >
                  <p className="mono text-xs font-black text-[#8ea198]">
                    {load.loadNumber}
                  </p>
                  <p className="mt-1 truncate text-sm font-black text-white">
                    {load.originCity} to {load.destCity}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <ProfitSummary load={selectedLoad} best={best} />
          <ProfitMap load={selectedLoad} comparisons={comparisons} />
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-white">
                Driver Profitability Comparison
              </p>
              <p className="mt-1 text-xs text-[#8ea198]">
                Ranked by margin, HOS feasibility, deadhead, and reliability.
              </p>
            </div>
            <Badge variant="blue">{comparisons.length} drivers</Badge>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
            <div className="hidden grid-cols-[1.2fr_0.6fr_0.7fr_0.8fr_0.75fr_0.8fr] gap-3 bg-[#111a16] px-4 py-3 text-xs font-black uppercase text-[#8ea198] lg:grid">
              <span>Driver</span>
              <span>Deadhead</span>
              <span>Pickup ETA</span>
              <span>Net margin</span>
              <span>Decision</span>
              <span>HOS fit</span>
            </div>
            <div className="divide-y divide-white/10">
              {comparisons.slice(0, 6).map((item, index) => (
                <ComparisonRow key={item.driver.id} item={item} top={index === 0} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <aside className="grid content-start gap-4">
        <div className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-white">AI Reasoning</p>
              <p className="mt-1 text-xs text-[#8ea198]">
                Dispatcher-readable decision summary.
              </p>
            </div>
            <Gauge className="h-5 w-5 text-[#26d69b]" />
          </div>
          <div className="mt-4 rounded-lg border border-[#26d69b]/20 bg-[#07100d] p-4">
            <p className="text-sm leading-6 text-[#b8c8c0]">
              {best?.profit.explanation ??
                "Select a load and available driver to generate profitability guidance."}
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            <ReasonFact
              icon={Fuel}
              label="Fuel model"
              value={
                best
                  ? `$${best.profit.fuelPrice.toFixed(2)}/gal, ${best.profit.estimatedGallons} gal`
                  : "Pending"
              }
            />
            <ReasonFact
              icon={Truck}
              label="Best driver"
              value={best ? best.driver.name : "Pending"}
            />
            <ReasonFact
              icon={ShieldCheck}
              label="Compliance"
              value={best ? `${best.hosFit} HOS fit` : "Pending"}
            />
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-white">Demo Outcome Mix</p>
              <p className="mt-1 text-xs text-[#8ea198]">
                Includes profitable, borderline, and bad load scenarios.
              </p>
            </div>
            <ReceiptText className="h-5 w-5 text-[#26d69b]" />
          </div>
          <div className="mt-4 grid gap-3">
            {scenarios.map((scenario) => (
              <div
                key={scenario.label}
                className="rounded-lg border border-white/10 bg-[#0d1210] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">
                      {scenario.label}
                    </p>
                    <p className="mono mt-1 text-xs text-[#8ea198]">
                      {scenario.loadNumber}
                    </p>
                  </div>
                  <VerdictBadge verdict={scenario.result.verdict} />
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <p className="mono text-xl font-black text-white">
                    ${scenario.result.netMargin.toLocaleString()}
                  </p>
                  <p className="mono text-sm font-black text-[#8ea198]">
                    {scenario.result.marginPercent.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function ProfitSummary({
  load,
  best,
}: {
  load: IntelligenceLoad;
  best?: DriverProfitability;
}) {
  const profit = best?.profit;
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mono text-xs font-black text-[#8ea198]">
            {load.loadNumber}
          </p>
          <h3 className="mt-1 text-2xl font-black text-white">
            {load.originCity} to {load.destCity}
          </h3>
          <p className="mt-2 text-sm text-[#8ea198]">
            {load.commodity} / {Math.round(load.estimatedMiles).toLocaleString()} loaded miles
          </p>
        </div>
        {profit ? <VerdictBadge verdict={profit.verdict} /> : null}
      </div>

      {profit ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SummaryMetric label="Revenue" value={`$${profit.revenue.toLocaleString()}`} />
            <SummaryMetric label="Total cost" value={`$${profit.totalCost.toLocaleString()}`} />
            <SummaryMetric label="Net margin" value={`$${profit.netMargin.toLocaleString()}`} />
          </div>
          <div className="mt-5 rounded-lg border border-white/10 bg-[#0d1210] p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-black uppercase text-[#8ea198]">
                  Margin percentage
                </p>
                <p className="mono mt-1 text-4xl font-black text-[#26d69b]">
                  {profit.marginPercent.toFixed(1)}%
                </p>
              </div>
              <p className="text-sm font-bold text-[#8ea198]">Target 27%</p>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-lg bg-white/10">
              <div
                className={clsx(
                  "h-full rounded-lg transition-all",
                  profit.verdict === "accept" && "bg-[#26d69b]",
                  profit.verdict === "review" && "bg-[#f4b84a]",
                  profit.verdict === "reject" && "bg-[#ff5d6c]"
                )}
                style={{
                  width: `${Math.max(4, Math.min(100, profit.marginPercent * 2))}%`,
                }}
              />
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            <CostRow label="Fuel cost" value={profit.fuelCost} />
            <CostRow label="Deadhead cost" value={profit.deadheadCost} />
            <CostRow label="Driver operating cost" value={profit.driverCost} />
            <CostRow label="Tolls" value={profit.tollCost} />
            <CostRow label="Fixed buffer" value={profit.bufferCost} />
          </div>
        </>
      ) : (
        <p className="mt-5 rounded-lg border border-white/10 bg-[#0d1210] p-4 text-sm text-[#8ea198]">
          No eligible drivers are available for comparison.
        </p>
      )}
    </div>
  );
}

function ProfitMap({
  load,
  comparisons,
}: {
  load: IntelligenceLoad;
  comparisons: DriverProfitability[];
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-white">Route Profit Map</p>
          <p className="mt-1 text-xs text-[#8ea198]">
            Driver deadhead positions and revenue lane.
          </p>
        </div>
        <MapPinned className="h-5 w-5 text-[#26d69b]" />
      </div>

      <div className="soft-grid relative mt-4 h-[330px] overflow-hidden rounded-lg border border-white/10 bg-[#090f0c]">
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 640 340"
          preserveAspectRatio="none"
        >
          <path
            d="M84 247 C182 114 281 282 382 160 C475 48 528 136 576 82"
            fill="none"
            stroke="rgba(218,255,237,0.12)"
            strokeWidth="24"
            strokeLinecap="round"
          />
          <path
            d="M84 247 C182 114 281 282 382 160 C475 48 528 136 576 82"
            fill="none"
            stroke="#26d69b"
            strokeWidth="5"
            strokeLinecap="round"
            className="route-dash"
          />
        </svg>

        <MapPin x="13%" y="71%" label={`${load.originCity}, ${load.originState}`} tone="green" />
        <MapPin x="82%" y="18%" label={`${load.destCity}, ${load.destState}`} tone="blue" />

        {comparisons.slice(0, 5).map((item, index) => {
          const coords = [
            ["24%", "54%"],
            ["36%", "76%"],
            ["45%", "42%"],
            ["57%", "64%"],
            ["70%", "34%"],
          ][index];
          return (
            <div
              key={item.driver.id}
              className="absolute"
              style={{ left: coords[0], top: coords[1] }}
            >
              <div
                className={clsx(
                  "flex h-9 w-9 items-center justify-center rounded-lg border bg-[#0d1210] shadow",
                  index === 0
                    ? "border-[#26d69b] text-[#26d69b]"
                    : item.profit.verdict === "review"
                      ? "border-[#f4b84a]/60 text-[#f4b84a]"
                      : "border-white/16 text-[#8ea198]"
                )}
              >
                <Truck className="h-4 w-4" />
              </div>
              <p className="mt-1 max-w-[120px] truncate rounded-md border border-white/10 bg-[#0d1210] px-2 py-1 text-xs font-black text-white">
                {item.driver.name}
              </p>
            </div>
          );
        })}

        <div className="absolute bottom-4 left-4 right-4 grid gap-2 sm:grid-cols-3">
          <MapStat icon={Route} label="Loaded route" value={`${Math.round(load.estimatedMiles)} mi`} />
          <MapStat icon={Fuel} label="Fuel spread" value="$4.08-$4.86" />
          <MapStat icon={CircleDollarSign} label="Best margin" value={comparisons[0] ? `$${comparisons[0].profit.netMargin.toLocaleString()}` : "Pending"} />
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({
  item,
  top,
}: {
  item: DriverProfitability;
  top: boolean;
}) {
  return (
    <div
      className={clsx(
        "grid gap-3 px-4 py-4 text-sm lg:grid-cols-[1.2fr_0.6fr_0.7fr_0.8fr_0.75fr_0.8fr] lg:items-center",
        top ? "bg-[#102019]" : "bg-[#0d1210]"
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-black text-white">{item.driver.name}</p>
          {top ? <Badge variant="green">Best</Badge> : null}
        </div>
        <p className="mt-1 text-xs text-[#8ea198]">
          {item.driver.truckNumber} / {item.driver.city}, {item.driver.state}
        </p>
      </div>
      <MobileMetric label="Deadhead" value={`${item.profit.deadheadMiles} mi`} />
      <MobileMetric label="Pickup ETA" value={`${item.pickupEtaMinutes} min`} />
      <MobileMetric
        label="Net margin"
        value={`$${item.profit.netMargin.toLocaleString()}`}
        tone={item.profit.netMargin > 0 ? "green" : "red"}
      />
      <div>
        <span className="mb-1 block text-xs font-black uppercase text-[#8ea198] lg:hidden">
          Decision
        </span>
        <VerdictBadge verdict={item.profit.verdict} />
      </div>
      <div>
        <span className="mb-1 block text-xs font-black uppercase text-[#8ea198] lg:hidden">
          HOS fit
        </span>
        <Badge
          variant={
            item.hosFit === "clear" ? "green" : item.hosFit === "tight" ? "amber" : "red"
          }
        >
          {item.hosFit}
        </Badge>
      </div>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: ProfitabilityResult["verdict"] }) {
  return (
    <Badge
      variant={
        verdict === "accept" ? "green" : verdict === "review" ? "amber" : "red"
      }
      className="px-3 py-1 text-xs font-black"
    >
      {verdict === "accept" ? "Accept" : verdict === "review" ? "Review" : "Reject"}
    </Badge>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d1210] p-3">
      <p className="text-xs font-black uppercase text-[#8ea198]">{label}</p>
      <p className="mono mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0d1210] px-3 py-2">
      <span className="text-sm text-[#8ea198]">{label}</span>
      <span className="mono text-sm font-black text-[#ff93a0]">
        -${value.toLocaleString()}
      </span>
    </div>
  );
}

function ReasonFact({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0d1210] p-3">
      <Icon className="h-5 w-5 text-[#26d69b]" />
      <div className="min-w-0">
        <p className="text-xs font-black uppercase text-[#8ea198]">{label}</p>
        <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
      </div>
    </div>
  );
}

function MapPin({
  x,
  y,
  label,
  tone,
}: {
  x: string;
  y: string;
  label: string;
  tone: "green" | "blue";
}) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      <div
        className={clsx(
          "flex h-10 w-10 items-center justify-center rounded-lg text-[#03120c] shadow",
          tone === "green" ? "bg-[#26d69b]" : "bg-[#53d7ff]"
        )}
      >
        <MapPinned className="h-5 w-5" />
      </div>
      <p className="mt-1 max-w-[150px] truncate rounded-md border border-white/10 bg-[#0d1210] px-2 py-1 text-xs font-black text-white">
        {label}
      </p>
    </div>
  );
}

function MapStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#070908]/88 p-3 backdrop-blur">
      <Icon className="h-4 w-4 text-[#26d69b]" />
      <p className="mt-2 text-xs text-[#8ea198]">{label}</p>
      <p className="mono mt-1 font-black text-white">{value}</p>
    </div>
  );
}

function MobileMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "red";
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-black uppercase text-[#8ea198] lg:hidden">
        {label}
      </span>
      <span
        className={clsx(
          "mono font-black",
          tone === "green" && "text-[#26d69b]",
          tone === "red" && "text-[#ff5d6c]",
          !tone && "text-white"
        )}
      >
        {value}
      </span>
    </div>
  );
}
