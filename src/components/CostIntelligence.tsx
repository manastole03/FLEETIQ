"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  Calculator,
  CircleDollarSign,
  Fuel,
  Gauge,
  Receipt,
  Route,
  Timer,
} from "lucide-react";
import type { CostBreakdown } from "@/types";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}

const DEBOUNCE_MS = 450;

export function CostIntelligence() {
  const [params, setParams] = useState({
    rate: 2400,
    loadedMiles: 1072,
    deadMiles: 42,
    fuelPrice: 4.2,
    driverPayPerHour: 28,
    mpg: 6.5,
  });

  const [result, setResult] = useState<CostBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const local = useMemo(() => calculateLocal(params), [params]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/cost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        if (!res.ok) throw new Error("Cost API failed");
        const data: CostBreakdown = await res.json();
        setResult(data);
      } catch {
        setResult({
          ...local,
          revenue: params.rate,
          verdict:
            local.marginPercent >= 25
              ? "accept"
              : local.marginPercent >= 12
                ? "marginal"
                : "reject",
          reasoning: `${local.marginPercent.toFixed(1)}% net margin after fuel, deadhead, driver pay, and toll assumptions.`,
        });
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [local, params]);

  const verdict =
    result?.verdict ??
    (local.marginPercent >= 25
      ? "accept"
      : local.marginPercent >= 12
        ? "marginal"
        : "reject");

  const verdictCopy = {
    accept: "Accept",
    marginal: "Review",
    reject: "Reject",
  }[verdict];

  const set = (key: keyof typeof params) => (value: number) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fade-in grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      <section className="panel p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-white">Cost Intelligence Engine</p>
            <p className="mt-1 text-sm leading-6 text-[#8ea198]">
              Tune rate confirmation assumptions before accepting the load.
            </p>
          </div>
          <Calculator className="h-6 w-6 text-[#26d69b]" />
        </div>

        <div className="mt-5 grid gap-3">
          <Slider label="Load rate" value={params.rate} min={500} max={6500} step={50} format={(value) => `$${value.toLocaleString()}`} onChange={set("rate")} />
          <Slider label="Loaded miles" value={params.loadedMiles} min={50} max={2500} step={10} format={(value) => `${value.toLocaleString()} mi`} onChange={set("loadedMiles")} />
          <Slider label="Deadhead miles" value={params.deadMiles} min={0} max={400} step={5} format={(value) => `${value} mi`} onChange={set("deadMiles")} />
          <Slider label="Fuel price" value={params.fuelPrice} min={3} max={7} step={0.05} format={(value) => `$${value.toFixed(2)}/gal`} onChange={set("fuelPrice")} />
          <Slider label="Driver pay" value={params.driverPayPerHour} min={18} max={55} step={1} format={(value) => `$${value}/hr`} onChange={set("driverPayPerHour")} />
          <Slider label="Truck MPG" value={params.mpg} min={4} max={9} step={0.1} format={(value) => `${value.toFixed(1)} mpg`} onChange={set("mpg")} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Assumption icon={Route} label="Total miles" value={`${params.loadedMiles + params.deadMiles}`} />
          <Assumption icon={Fuel} label="Gallons" value={`${((params.loadedMiles + params.deadMiles) / params.mpg).toFixed(1)}`} />
          <Assumption icon={Timer} label="Drive hours" value={`${(params.loadedMiles / 55).toFixed(1)}`} />
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-black text-white">Real-Time Profitability</p>
            <p className="mt-1 text-sm leading-6 text-[#8ea198]">
              Revenue minus fuel, deadhead, driver operating cost, and tolls.
            </p>
          </div>
          <span
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-black",
              verdict === "accept" && "bg-[#14362a] text-[#55f0b1]",
              verdict === "marginal" && "bg-[#3b2d12] text-[#ffd479]",
              verdict === "reject" && "bg-[#3b171d] text-[#ff93a0]"
            )}
          >
            {verdictCopy}
          </span>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-lg border border-white/10 bg-[#0d1210] p-4">
            <MoneyLine label="Load revenue" value={params.rate} positive />
            <MoneyLine label="Fuel cost" value={local.fuelCost} />
            <MoneyLine label="Deadhead fuel" value={local.deadheadFuelCost} />
            <MoneyLine label="Driver pay" value={local.driverPay} />
            <MoneyLine label="Tolls and fees" value={local.tolls} />
            <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-4">
              <div>
                <p className="text-xs font-black uppercase text-[#8ea198]">
                  Net margin
                </p>
                <p
                  className={clsx(
                    "mono mt-1 text-3xl font-black",
                    local.netMargin >= 0 ? "text-[#26d69b]" : "text-[#ff5d6c]"
                  )}
                >
                  ${local.netMargin.toLocaleString()}
                </p>
              </div>
              <p className="mono text-xl font-black text-white">
                {local.marginPercent.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="grid content-start gap-3">
            <div className="rounded-lg border border-white/10 bg-[#111a16] p-4">
              <CircleDollarSign className="h-6 w-6 text-[#26d69b]" />
              <p className="mt-3 text-sm font-black text-white">Decision reasoning</p>
              {loading ? (
                <p className="mt-2 text-sm text-[#8ea198]">Analyzing updated economics...</p>
              ) : (
                <p className="mt-2 text-sm leading-6 text-[#b8c8c0]">
                  {result?.reasoning ??
                    `${local.marginPercent.toFixed(1)}% net margin under current assumptions.`}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-[#26d69b]/25 bg-[#102019] p-4">
              <Gauge className="h-6 w-6 text-[#26d69b]" />
              <p className="mt-3 text-sm font-black text-white">Margin threshold</p>
              <p className="mt-2 text-sm leading-6 text-[#b8c8c0]">
                Accept above 25%, review between 12% and 25%, reject below 12%
                unless the rate improves or a closer driver is found.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs font-bold text-[#8ea198]">
            <span>0%</span>
            <span>25% target</span>
            <span>50%+</span>
          </div>
          <div className="h-3 overflow-hidden rounded-lg bg-white/10">
            <div
              className={clsx(
                "h-full rounded-lg transition-all",
                local.marginPercent >= 25
                  ? "bg-[#26d69b]"
                  : local.marginPercent >= 12
                    ? "bg-[#f4b84a]"
                    : "bg-[#ff5d6c]"
              )}
              style={{ width: `${Math.max(2, Math.min(100, local.marginPercent * 2))}%` }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: SliderProps) {
  return (
    <label className="grid gap-2 rounded-lg border border-white/10 bg-[#0d1210] p-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-black text-white">{label}</span>
        <span className="mono text-sm font-black text-[#26d69b]">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full accent-[#26d69b]"
      />
    </label>
  );
}

function Assumption({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Receipt;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d1210] p-3">
      <Icon className="h-5 w-5 text-[#26d69b]" />
      <p className="mt-2 text-xs font-black uppercase text-[#8ea198]">
        {label}
      </p>
      <p className="mono mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function MoneyLine({
  label,
  value,
  positive,
}: {
  label: string;
  value: number;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 py-3 last:border-0">
      <span className="text-sm text-[#8ea198]">{label}</span>
      <span
        className={clsx(
          "mono text-sm font-black",
          positive ? "text-[#26d69b]" : "text-[#ff5d6c]"
        )}
      >
        {positive ? "+" : "-"}${value.toLocaleString()}
      </span>
    </div>
  );
}

function calculateLocal(params: {
  rate: number;
  loadedMiles: number;
  deadMiles: number;
  fuelPrice: number;
  driverPayPerHour: number;
  mpg: number;
}) {
  const fuelCost = Math.round((params.loadedMiles / params.mpg) * params.fuelPrice);
  const deadheadFuelCost = Math.round((params.deadMiles / params.mpg) * params.fuelPrice);
  const driverPay = Math.round((params.loadedMiles / 55) * params.driverPayPerHour);
  const tolls = Math.round(params.loadedMiles * 0.06);
  const netMargin =
    params.rate - fuelCost - deadheadFuelCost - driverPay - tolls;
  const marginPercent = params.rate > 0 ? (netMargin / params.rate) * 100 : 0;
  return {
    fuelCost,
    deadheadFuelCost,
    driverPay,
    tolls,
    netMargin,
    marginPercent,
  };
}
