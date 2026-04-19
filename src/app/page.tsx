"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  Fuel,
  Gauge,
  MapPinned,
  RadioTower,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
  UploadCloud,
} from "lucide-react";

const heroImage =
  "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=2000&q=90";
const operationsImage =
  "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1400&q=85";
const driverImage =
  "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1400&q=85";

const valueProps = [
  {
    icon: Route,
    title: "Smart Dispatch",
    text: "Rank drivers by live position, HOS, deadhead, truck profile, ETA fit, and reliability.",
  },
  {
    icon: BellRing,
    title: "Proactive Alerts",
    text: "Surface HOS pressure, route restrictions, document gaps, and late-risk signals before they become calls.",
  },
  {
    icon: CircleDollarSign,
    title: "Cost Intelligence",
    text: "Evaluate revenue, fuel, driver pay, tolls, deadhead, net margin, and acceptance quality in real time.",
  },
  {
    icon: ShieldCheck,
    title: "Safety & Compliance",
    text: "Block assignments that violate legal drive windows, route limits, bridge clearance, or weight constraints.",
  },
  {
    icon: FileCheck2,
    title: "Billing Automation",
    text: "Track BOL, POD, fuel receipt, and rate-con readiness from dispatch to settlement.",
  },
];

const stats = [
  { label: "Dispatch decision", value: "90 sec" },
  { label: "Deadhead reduced", value: "28 mi" },
  { label: "Margin protected", value: "$740" },
  { label: "Compliance checks", value: "7" },
];

const workflow = [
  "Load arrives from rate confirmation",
  "FleetIQ scores available drivers",
  "Cost and compliance guardrails run",
  "Dispatcher assigns with explanation",
  "Driver accepts and uploads documents",
];

export default function Home() {
  const [intro, setIntro] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIntro(false), 1250);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="app-bg min-h-screen text-white">
      {intro ? <IntroLoader /> : null}

      <section
        className="relative min-h-[86vh] overflow-hidden bg-[#111827] text-white"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(7, 12, 22, 0.91), rgba(7, 12, 22, 0.56), rgba(7, 12, 22, 0.18)), url(${heroImage})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-[#087252] shadow-lg">
              <Truck className="h-6 w-6" />
            </span>
            <span className="text-xl font-bold">FleetIQ</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-white/82 md:flex">
            <a href="#platform" className="hover:text-white">
              Platform
            </a>
            <a href="#workflow" className="hover:text-white">
              Workflow
            </a>
            <a href="#previews" className="hover:text-white">
              Product
            </a>
            <Link href="/login/driver" className="hover:text-white">
              Driver App
            </Link>
          </nav>
          <Link
            href="/login"
            className="rounded-lg border border-white/35 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white hover:text-[#111827]"
          >
            Sign in
          </Link>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.04fr_0.96fr] lg:pt-20">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-lg bg-white/12 px-3 py-2 text-sm font-bold text-white backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-[#5ee0ab]" />
              NavPro Intelligence Layer
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[1.02] sm:text-6xl lg:text-7xl">
              AI dispatch decisions before the load hits your margin.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/84">
              FleetIQ turns Trucker Path and NavPro operating data into ranked
              load matches, profitability calls, compliance guardrails, and a
              connected driver workflow for 5-50 truck fleets.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login/admin"
                className="cta-glow inline-flex items-center justify-center gap-2 rounded-lg bg-[#0f9f6e] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#087252]"
              >
                Open Live Dispatch Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#previews"
                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3.5 text-sm font-black text-[#111827] transition hover:bg-[#edf2f7]"
              >
                See Product Flow
              </Link>
            </div>
          </div>

          <div className="self-end">
            <div className="glass-panel p-4">
              <div className="flex items-center justify-between border-b border-white/16 pb-4">
                <div>
                  <p className="text-sm text-white/70">Recommended dispatch</p>
                  <p className="mt-1 text-2xl font-black">Carlos Mendez</p>
                </div>
                <span className="rounded-lg bg-[#5ee0ab] px-4 py-3 text-lg font-black text-[#072d22]">
                  94
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {stats.slice(0, 3).map((metric) => (
                  <div key={metric.label} className="rounded-lg bg-white/12 p-3">
                    <p className="text-sm text-white/68">{metric.label}</p>
                    <p className="mono mt-2 text-2xl font-black">{metric.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-white/10 bg-[#0d1210] p-4 text-white">
                <p className="text-sm font-black text-[#087252]">
                  Grok explanation
                </p>
                <p className="mt-2 text-sm leading-6 text-[#b8c8c0]">
                  Assign TP-101. Low deadhead, enough HOS for the legal drive
                  window, and the highest projected net margin after fuel,
                  tolls, and driver operating cost.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-[#087252]">
              Dispatch intelligence
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight">
              One operating layer for matching, margin, safety, and paperwork.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#8ea198]">
            Built for dispatchers who need a fast, trustworthy answer without
            jumping between calls, spreadsheets, ELD screens, and rate cons.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-5">
          {valueProps.map((item) => (
            <article
              key={item.title}
              className="feature-card rounded-lg border border-white/10 bg-[#0d1210] p-5"
            >
              <item.icon className="h-7 w-7 text-[#0f9f6e]" />
              <h3 className="mt-5 text-lg font-black">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#8ea198]">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0d1210]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-black uppercase text-[#087252]">
              Fleet efficiency snapshot
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight">
              Built to show ROI in the first demo.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#8ea198]">
              Reduce manual dispatch time, protect rate quality, avoid
              non-compliant assignments, and make driver handoff visible from
              one screen.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-white/10 bg-[#111a16] p-5"
              >
                <p className="text-sm font-semibold text-[#8ea198]">
                  {stat.label}
                </p>
                <p className="mono mt-3 text-3xl font-black">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-black uppercase text-[#087252]">
              How it works
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight">
              From broker call to driver acceptance in one decision loop.
            </h2>
            <div className="mt-7 grid gap-3">
              {workflow.map((step, index) => (
                <div
                  key={step}
                  className="flex items-center gap-4 rounded-lg border border-white/10 bg-[#0d1210] p-4"
                >
                  <span className="mono flex h-9 w-9 items-center justify-center rounded-lg bg-[#111827] text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <p className="font-bold">{step}</p>
                </div>
              ))}
            </div>
          </div>
          <Image
            src={operationsImage}
            alt="Fleet operations dispatch desk"
            width={900}
            height={620}
            className="h-full min-h-[360px] w-full rounded-lg border border-white/10 object-cover shell-shadow"
          />
        </div>
      </section>

      <section id="previews" className="bg-[#111827] px-5 py-14 text-white sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-[#5ee0ab]">
                Product previews
              </p>
              <h2 className="mt-3 text-4xl font-black leading-tight">
                Dispatcher command center and driver mobile workflow.
              </h2>
            </div>
            <Link
              href="/login/admin"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-black text-[#111827] transition hover:bg-[#edf2f7]"
            >
              Explore Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <DashboardPreview />
            <DriverPreview />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Image
          src={driverImage}
          alt="Truck driver using mobile workflow"
          width={900}
          height={620}
          className="h-full min-h-[340px] w-full rounded-lg border border-white/10 object-cover shell-shadow"
        />
        <div className="flex flex-col justify-center">
          <p className="text-sm font-black uppercase text-[#087252]">
            Driver-connected operations
          </p>
          <h2 className="mt-3 text-4xl font-black leading-tight">
            Dispatch sees the trip. Drivers see only what matters.
          </h2>
          <p className="mt-4 text-base leading-7 text-[#8ea198]">
            Trip progress, HOS, fuel stops, parking, alerts, and document
            capture stay clean and touch-friendly on the mobile side.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              "HOS-aware assignment cards",
              "Fuel and parking prompts",
              "BOL, POD, receipt status",
              "Trip timeline updates",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0d1210] p-4"
              >
                <CheckCircle2 className="h-5 w-5 text-[#0f9f6e]" />
                <span className="text-sm font-bold">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#0d1210]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-[#087252]">
              Investor-ready demo
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Show smart dispatch, margin control, compliance, and driver handoff.
            </h2>
          </div>
          <Link
            href="/login/admin"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0f9f6e] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#087252]"
          >
            Launch FleetIQ
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-[#8ea198] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-[#0f9f6e]" />
          <span>FleetIQ Smart Dispatch and Profitability Engine</span>
        </div>
        <span>Grok-powered reasoning with deterministic dispatch rules.</span>
      </footer>
    </main>
  );
}

function IntroLoader() {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#070908]">
      <div className="truck-loader-stage">
        <div className="map-pulse" />
        <div className="loader-truck">
          <Truck className="h-9 w-9 text-white" />
        </div>
        <div className="loader-road" />
        <p className="mt-8 text-center text-sm font-black text-white">
          FleetIQ is syncing dispatch intelligence
        </p>
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="rounded-lg border border-white/14 bg-[#0d1210] p-4 text-white shell-shadow">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <p className="text-xs font-black uppercase text-[#087252]">
            Dispatcher
          </p>
          <p className="mt-1 text-xl font-black">Load matching board</p>
        </div>
        <BadgeText text="Live scoring" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <PreviewMetric icon={Gauge} label="AI score" value="94" />
        <PreviewMetric icon={Fuel} label="Fuel cost" value="$693" />
        <PreviewMetric icon={ShieldCheck} label="Compliance" value="Clear" />
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
        {[
          ["Carlos Mendez", "18 mi", "$1,070", "Assign"],
          ["Devon Riley", "42 mi", "$996", "Review"],
          ["Maria Torres", "9 mi", "Blocked", "HOS"],
        ].map((row) => (
          <div
            key={row[0]}
            className="grid grid-cols-4 border-b border-[#edf2f7] px-4 py-3 text-sm last:border-0"
          >
            {row.map((cell) => (
              <span key={cell} className="font-semibold">
                {cell}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DriverPreview() {
  return (
    <div className="rounded-lg border border-white/14 bg-[#0d1210] p-4 text-white shell-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase text-[#087252]">Driver</p>
          <p className="mt-1 text-xl font-black">Assigned trip</p>
        </div>
        <BadgeText text="Mobile" />
      </div>
      <div className="mt-4 rounded-lg border border-white/10 bg-[#111a16] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="mono text-xs font-black text-[#8ea198]">LOAD-4821</p>
            <p className="mt-1 font-black">Phoenix to Dallas</p>
          </div>
          <Truck className="h-6 w-6 text-[#0f9f6e]" />
        </div>
        <div className="mt-4 h-2 rounded-lg bg-white/10">
          <div className="h-full w-[64%] rounded-lg bg-[#0f9f6e]" />
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <PreviewMetric icon={UploadCloud} label="Documents" value="2/3" />
        <PreviewMetric icon={RadioTower} label="ETA" value="6.4h" />
      </div>
    </div>
  );
}

function PreviewMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Truck;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#111a16] p-3">
      <Icon className="h-5 w-5 text-[#0f9f6e]" />
      <p className="mt-2 text-xs font-semibold text-[#8ea198]">{label}</p>
      <p className="mono mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function BadgeText({ text }: { text: string }) {
  return (
    <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-[#087252]">
      {text}
    </span>
  );
}
