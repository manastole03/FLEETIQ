"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BellRing,
  Bot,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileCheck,
  Fuel,
  MapPin,
  Navigation,
  ReceiptText,
  Send,
  ShieldCheck,
  Sparkles,
  Timer,
  Truck,
  Upload,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  buildDocumentSummary,
  getDocumentReminderText,
  getStopRecommendations,
  type DocumentSummary,
  type DocumentType,
  type StopRecommendation,
  type StopType,
} from "@/lib/intelligence";

interface ActiveTrip {
  assignmentId: string;
  assignmentStatus: string;
  loadNumber: string;
  originCity: string;
  originState: string;
  destCity: string;
  destState: string;
  commodity: string;
  estimatedMiles: number;
  pickupDate: string;
  deliveryDate: string;
  rate: number;
}

interface DriverInfo {
  name: string;
  title: string;
  driverCode: string;
  truckNumber: string;
  homeTerminal: string;
  hosRemaining: number;
  fuelLevel: number | null;
  completedTrips: number;
  weeklyEarnings: number;
}

type TripStatus =
  | "ASSIGNED"
  | "ACCEPTED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "DECLINED";

export default function DriverDashboardClient({
  activeTrip,
  driverInfo,
}: {
  activeTrip: ActiveTrip;
  driverInfo: DriverInfo;
}) {
  const [status, setStatus] = useState<TripStatus>(
    activeTrip.assignmentStatus === "IN_TRANSIT" ? "IN_TRANSIT" : "ASSIGNED"
  );
  const [pickupComplete, setPickupComplete] = useState(
    activeTrip.assignmentStatus === "IN_TRANSIT"
  );
  const [milesDriven, setMilesDriven] = useState(0);
  const [docs, setDocs] = useState({
    bol: false,
    fuelReceipt: false,
    pod: false,
    other: false,
  });
  const [documentSummaries, setDocumentSummaries] = useState<DocumentSummary[]>([]);
  const [assistantQuestion, setAssistantQuestion] = useState(
    "Where should I stop next?"
  );
  const [selectedStopType, setSelectedStopType] = useState<StopType>("fuel");
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [refueled, setRefueled] = useState(false);

  const progress = Math.min(100, (milesDriven / activeTrip.estimatedMiles) * 100);
  const etaHours = Math.max(0, (activeTrip.estimatedMiles - milesDriven) / 55);
  const missingDocs = useMemo(
    () =>
      [
        !docs.bol ? "BOL" : "",
        !docs.fuelReceipt ? "fuel receipt" : "",
        !docs.pod ? "POD" : "",
        !docs.other ? "other trip docs" : "",
      ].filter(Boolean),
    [docs.bol, docs.fuelReceipt, docs.other, docs.pod]
  );

  const nextStop = useMemo(() => {
    if (progress < 30) return "Love's Travel Stop - 23 mi";
    if (progress < 65) return "Weigh station - open - 45 mi";
    if (progress < 96) return "Receiver check-in - 54 mi";
    return "Delivery yard";
  }, [progress]);

  const stopRecommendations = useMemo(
    () => getStopRecommendations({ activeTrip, driverInfo, progress }),
    [activeTrip, driverInfo, progress]
  );
  const selectedStop =
    stopRecommendations.find(
      (stop) => stop.type === selectedStopType && stop.id === selectedStopId
    ) ??
    stopRecommendations.find((stop) => stop.type === selectedStopType) ??
    stopRecommendations[0];

  const documentReminder = getDocumentReminderText({
    status,
    pickupComplete,
    docs,
  });

  const smartReminders = useMemo(
    () => [
      {
        title: "HOS-aware rest plan",
        text:
          driverInfo.hosRemaining < 7
            ? "Plan a break before the next long leg. NavPro recommends parking inside the next 90 miles."
            : "HOS margin is healthy for the current legal drive window.",
        tone: driverInfo.hosRemaining < 7 ? "amber" : "green",
      },
      {
        title: "Fuel receipt reminder",
        text: docs.fuelReceipt
          ? "Fuel receipt is attached and visible to operations."
          : refueled
            ? "Refuel is logged. Upload the fuel receipt to clear billing risk."
            : "Upload the fuel receipt after your next refuel to keep billing clean.",
        tone: docs.fuelReceipt ? "green" : "blue",
      },
      {
        title: "Parking recommendation",
        text: "Reserve parking near the rest window: 34 truck spaces are expected at the next safe stop.",
        tone: "blue",
      },
      {
        title: "Route risk alert",
        text:
          progress > 60
            ? "Receiver area has tight dock approach. Slow check-in is likely."
            : "Truck-safe route is clear for height, weight, and major restrictions.",
        tone: progress > 60 ? "amber" : "green",
      },
    ],
    [docs.fuelReceipt, driverInfo.hosRemaining, progress, refueled]
  );

  const assistantResponses = useMemo<Record<string, string>>(
    () => ({
      "Where should I stop next?": `${nextStop} is the next recommended stop. It keeps the route truck-safe and preserves enough HOS buffer for the following leg.`,
      "Am I at risk of running out of HOS?":
        driverInfo.hosRemaining < etaHours
          ? `Yes. You have ${driverInfo.hosRemaining}h available and about ${etaHours.toFixed(
              1
            )}h remaining. Take a legal rest before continuing.`
          : `No immediate risk. You have ${driverInfo.hosRemaining}h available against about ${etaHours.toFixed(
              1
            )}h remaining, with a live compliance buffer.`,
      "What documents are still pending?": missingDocs.length
        ? `Pending documents: ${missingDocs.join(", ")}. Upload them before settlement review.`
        : "All required trip documents are complete and ready for operations.",
      "What's the cheapest fuel stop?":
        "Love's Travel Stop is currently the recommended fuel stop at $4.12/gal, with truck parking availability on the same corridor.",
    }),
    [driverInfo.hosRemaining, etaHours, missingDocs, nextStop]
  );

  const acceptTrip = () => {
    setStatus("ACCEPTED");
  };

  const startTrip = () => {
    setStatus("IN_TRANSIT");
    setMilesDriven(18);
  };

  const declineTrip = () => {
    setStatus("DECLINED");
  };

  const markPickupComplete = () => {
    setPickupComplete(true);
    setMilesDriven((current) => Math.max(current, 45));
  };

  const advanceTrip = () => {
    const nextMiles = Math.min(
      activeTrip.estimatedMiles,
      milesDriven + Math.max(55, Math.round(activeTrip.estimatedMiles * 0.18))
    );
    setMilesDriven(nextMiles);
  };

  const markDeliveryComplete = () => {
    setMilesDriven(activeTrip.estimatedMiles);
    setStatus("DELIVERED");
  };

  const submitPod = () => {
    uploadDocument("pod");
  };

  const uploadDocument = (type: DocumentType) => {
    const key = type === "fuelReceipt" ? "fuelReceipt" : type;
    setDocs((prev) => ({ ...prev, [key]: true }));
    setDocumentSummaries((prev) => [
      buildDocumentSummary({
        type,
        loadNumber: activeTrip.loadNumber,
        origin: `${activeTrip.originCity}, ${activeTrip.originState}`,
        destination: `${activeTrip.destCity}, ${activeTrip.destState}`,
      }),
      ...prev.filter((summary) => summary.type !== type),
    ]);
  };

  return (
    <div className="fade-in grid gap-5">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_440px]">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0b110f] shell-shadow">
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_270px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={status} />
                <Badge variant="blue">${activeTrip.rate.toLocaleString()}</Badge>
                <span className="mono rounded-md border border-white/10 bg-[#070908] px-2 py-1 text-xs font-black text-[#8ea198]">
                  {activeTrip.loadNumber}
                </span>
              </div>
              <h2 className="mt-4 text-4xl font-black leading-tight text-white">
                {activeTrip.originCity} to {activeTrip.destCity}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#8ea198]">
                {activeTrip.commodity} / {Math.round(activeTrip.estimatedMiles)} miles / Pickup{" "}
                {formatDate(activeTrip.pickupDate)}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              <TripStat icon={Navigation} label="Progress" value={`${Math.round(progress)}%`} />
              <TripStat icon={Timer} label="ETA" value={`${etaHours.toFixed(1)}h`} />
              <TripStat icon={ShieldCheck} label="HOS" value={`${driverInfo.hosRemaining}h`} />
            </div>
          </div>

          <div className="relative min-h-[300px] border-y border-white/10 bg-[#070908]">
            <DriverRouteMap
              origin={`${activeTrip.originCity}, ${activeTrip.originState}`}
              destination={`${activeTrip.destCity}, ${activeTrip.destState}`}
              progress={progress}
              selectedStop={selectedStop}
            />
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <Location label="Pickup" city={activeTrip.originCity} state={activeTrip.originState} />
            <div className="hidden h-px bg-white/10 md:block" />
            <div className="text-left md:text-right">
              <Location label="Delivery" city={activeTrip.destCity} state={activeTrip.destState} />
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/10 p-5 sm:grid-cols-3">
            <DriverSignal label="HOS clock" value={`${driverInfo.hosRemaining}h`} tone="green" />
            <DriverSignal label="Fuel" value={`${Math.round(driverInfo.fuelLevel ?? 0)}%`} tone="blue" />
            <DriverSignal label="Next stop" value={nextStop} tone="dark" />
          </div>

          <div className="border-t border-white/10 p-5">
            {status === "ASSIGNED" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={acceptTrip}
                  className="rounded-lg bg-[#26d69b] px-4 py-4 text-sm font-black text-[#03120c] transition hover:bg-[#55f0b1]"
                >
                  Accept Assignment
                </button>
                <button
                  onClick={declineTrip}
                  className="rounded-lg border border-white/10 bg-[#0d1210] px-4 py-4 text-sm font-black text-white transition hover:border-[#ff5d6c]/45 hover:text-[#ff93a0]"
                >
                  Decline
                </button>
              </div>
            ) : status === "ACCEPTED" ? (
              <button
                onClick={startTrip}
                className="w-full rounded-lg bg-white px-4 py-4 text-sm font-black text-[#070908] transition hover:bg-[#dfffee]"
              >
                Start Trip to Pickup
              </button>
            ) : status === "IN_TRANSIT" ? (
              !pickupComplete ? (
                <button
                  onClick={markPickupComplete}
                  className="w-full rounded-lg bg-[#26d69b] px-4 py-4 text-sm font-black text-[#03120c] transition hover:bg-[#55f0b1]"
                >
                  Mark Pickup Complete
                </button>
              ) : progress < 96 ? (
                <button
                  onClick={advanceTrip}
                  className="w-full rounded-lg bg-white px-4 py-4 text-sm font-black text-[#070908] transition hover:bg-[#dfffee]"
                >
                  Update Trip Status
                </button>
              ) : (
                <button
                  onClick={markDeliveryComplete}
                  className="w-full rounded-lg bg-[#26d69b] px-4 py-4 text-sm font-black text-[#03120c] transition hover:bg-[#55f0b1]"
                >
                  Mark Delivery Complete
                </button>
              )
            ) : status === "DELIVERED" ? (
              <div className="rounded-lg border border-[#26d69b]/25 bg-[#102019] p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#26d69b]" />
                  <p className="text-sm font-semibold text-[#b8c8c0]">
                    Delivery complete. Submit POD to release the billing packet.
                  </p>
                </div>
                {!docs.pod ? (
                  <button
                    onClick={submitPod}
                    className="mt-4 w-full rounded-lg bg-[#26d69b] px-4 py-3 text-sm font-black text-[#03120c] hover:bg-[#55f0b1]"
                  >
                    Submit POD
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-[#ff5d6c]/25 bg-[#211015] p-4 text-[#ff93a0]">
                <XCircle className="mt-0.5 h-5 w-5" />
                <p className="text-sm font-semibold">
                  Assignment declined. Dispatch should select another driver.
                </p>
              </div>
            )}
          </div>
        </div>

        <RecommendedStopPanel
          stops={stopRecommendations}
          selectedType={selectedStopType}
          selectedStop={selectedStop}
          onSelectType={setSelectedStopType}
          onSelectStop={setSelectedStopId}
          onLogFuel={() => {
            setRefueled(true);
            setSelectedStopType("fuel");
          }}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="grid content-start gap-5">
          <DriverPanel
            title="AI Trip Copilot"
            subtitle="Fast answers using the active route, HOS, stops, and documents."
            icon={<Bot className="h-5 w-5 text-[#26d69b]" />}
          >
            <div className="rounded-lg border border-[#26d69b]/20 bg-[#07100d] p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#26d69b]" />
                <p className="text-sm leading-6 text-[#b8c8c0]">
                  {assistantResponses[assistantQuestion]}
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {Object.keys(assistantResponses).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setAssistantQuestion(prompt)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0d1210] px-3 py-2.5 text-left text-xs font-bold text-[#b8c8c0] transition hover:border-[#26d69b]/35 hover:text-white"
                >
                  <span>{prompt}</span>
                  <Send className="h-3.5 w-3.5 shrink-0 text-[#26d69b]" />
                </button>
              ))}
            </div>
          </DriverPanel>

          <DriverPanel
            title="Smart Reminders"
            subtitle="Priority nudges for HOS, receipts, parking, and route risk."
            icon={<BellRing className="h-5 w-5 text-[#26d69b]" />}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {smartReminders.map((reminder) => (
                <ReminderRow
                  key={reminder.title}
                  title={reminder.title}
                  text={reminder.text}
                  tone={reminder.tone}
                />
              ))}
            </div>
          </DriverPanel>
        </div>

        <div className="grid content-start gap-5">
          <DriverPanel
            title="Trip Documents"
            subtitle="Upload required documents and review AI summaries."
            icon={<FileCheck className="h-5 w-5 text-[#26d69b]" />}
          >
            <div className="rounded-lg border border-[#f4b84a]/25 bg-[#211b10] p-4">
              <div className="flex items-start gap-3">
                <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-[#f4b84a]" />
                <p className="text-sm leading-6 text-[#b8c8c0]">
                  {documentReminder}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DocRow complete={docs.bol} label="Bill of Lading" action={() => uploadDocument("bol")} />
              <DocRow complete={docs.fuelReceipt} label="Fuel receipt" action={() => uploadDocument("fuelReceipt")} />
              <DocRow complete={docs.pod} label="Proof of Delivery" action={status === "DELIVERED" ? submitPod : undefined} />
              <DocRow complete={docs.other} label="Other trip docs" action={() => uploadDocument("other")} />
            </div>

            <div className="mt-5 grid gap-3">
              <p className="text-xs font-black uppercase text-[#8ea198]">
                AI document summaries
              </p>
              {documentSummaries.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-[#0d1210] p-4 text-sm leading-6 text-[#8ea198]">
                  Upload BOL, POD, receipt, or trip docs to generate a
                  structured summary for dispatch and billing.
                </div>
              ) : (
                <div className="grid gap-3">
                  {documentSummaries.map((summary) => (
                    <DriverDocumentSummary key={summary.id} summary={summary} />
                  ))}
                </div>
              )}
            </div>
          </DriverPanel>

          <DriverPanel
            title="Status Timeline"
            subtitle="Operations can see these trip events."
            icon={<Clock3 className="h-5 w-5 text-[#26d69b]" />}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <TimelineItem complete label="Assignment sent" />
              <TimelineItem complete={status !== "ASSIGNED" && status !== "DECLINED"} label="Driver accepted" />
              <TimelineItem complete={pickupComplete} label="Pickup complete" />
              <TimelineItem complete={status === "IN_TRANSIT" || status === "DELIVERED"} label="In transit" />
              <TimelineItem complete={refueled} label="Fuel stop logged" />
              <TimelineItem complete={docs.fuelReceipt} label="Fuel receipt uploaded" />
              <TimelineItem complete={status === "DELIVERED"} label="Delivery complete" />
              <TimelineItem complete={docs.pod} label="POD submitted" />
            </div>
          </DriverPanel>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ASSIGNED") return <Badge variant="amber">Needs action</Badge>;
  if (status === "ACCEPTED") return <Badge variant="green">Accepted</Badge>;
  if (status === "IN_TRANSIT") return <Badge variant="blue">In transit</Badge>;
  if (status === "DELIVERED") return <Badge variant="green">Delivered</Badge>;
  return <Badge variant="red">Declined</Badge>;
}

function DriverRouteMap({
  origin,
  destination,
  progress,
  selectedStop,
}: {
  origin: string;
  destination: string;
  progress: number;
  selectedStop?: StopRecommendation;
}) {
  const routeWidth = Math.max(6, Math.min(96, progress));

  return (
    <div className="soft-grid absolute inset-0 overflow-hidden">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 840 320"
        preserveAspectRatio="none"
      >
        <path
          d="M68 237 C172 89 306 270 424 148 C552 16 668 120 776 62"
          fill="none"
          stroke="rgba(218,255,237,0.13)"
          strokeWidth="28"
          strokeLinecap="round"
        />
        <path
          d="M68 237 C172 89 306 270 424 148 C552 16 668 120 776 62"
          fill="none"
          stroke="#26d69b"
          strokeWidth="6"
          strokeLinecap="round"
          className="route-dash"
        />
      </svg>

      <div
        className="absolute left-[8%] right-[8%] top-8 h-1 overflow-hidden rounded-lg bg-white/10"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-lg bg-[#26d69b] transition-all"
          style={{ width: `${routeWidth}%` }}
        />
      </div>

      <MapLabel x="8%" y="68%" label={origin} tone="green" />
      <MapLabel x="78%" y="16%" label={destination} tone="blue" />

      <div className="absolute left-[18%] top-[58%] flex h-10 w-10 items-center justify-center rounded-lg border border-[#26d69b]/50 bg-[#0d1210] text-[#26d69b] shadow-lg">
        <Truck className="h-5 w-5" />
      </div>

      {selectedStop ? (
        <div
          className="absolute"
          style={{ left: `${selectedStop.mapX + 4}%`, top: `${selectedStop.mapY + 8}%` }}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#f4b84a]/50 bg-[#0d1210] text-[#f4b84a] shadow-lg">
            {selectedStop.type === "fuel" ? (
              <Fuel className="h-4 w-4" />
            ) : selectedStop.type === "parking" ? (
              <Truck className="h-4 w-4" />
            ) : (
              <ClipboardList className="h-4 w-4" />
            )}
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-5 left-5 right-5 grid gap-3 sm:grid-cols-3">
        <MapStat label="Current progress" value={`${Math.round(progress)}%`} />
        <MapStat
          label="Recommended stop"
          value={selectedStop ? `${selectedStop.distanceAhead} mi` : "Pending"}
        />
        <MapStat
          label="Route deviation"
          value={selectedStop ? `${selectedStop.deviationMinutes} min` : "0 min"}
        />
      </div>
    </div>
  );
}

function MapLabel({
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
        className={
          tone === "green"
            ? "flex h-10 w-10 items-center justify-center rounded-lg bg-[#26d69b] text-[#03120c] shadow-lg"
            : "flex h-10 w-10 items-center justify-center rounded-lg bg-[#53d7ff] text-[#03120c] shadow-lg"
        }
      >
        <MapPin className="h-5 w-5" />
      </div>
      <p className="mt-2 max-w-[190px] truncate rounded-md border border-white/10 bg-[#0d1210]/90 px-2 py-1 text-xs font-black text-white backdrop-blur">
        {label}
      </p>
    </div>
  );
}

function MapStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d1210]/90 p-3 backdrop-blur">
      <p className="text-[10px] font-black uppercase text-[#8ea198]">{label}</p>
      <p className="mono mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function Location({
  label,
  city,
  state,
}: {
  label: string;
  city: string;
  state: string;
}) {
  return (
    <div className="min-w-[92px]">
      <p className="text-xs font-black uppercase text-[#8ea198]">{label}</p>
      <p className="mt-1 font-black text-white">{city}</p>
      <p className="text-xs text-[#8ea198]">{state}</p>
    </div>
  );
}

function TripStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
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

function DriverSignal({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "blue" | "dark";
}) {
  return (
    <div
      className={
        tone === "green"
          ? "rounded-lg border border-[#26d69b]/25 bg-[#102019] p-3 text-[#55f0b1]"
          : tone === "blue"
            ? "rounded-lg border border-[#53d7ff]/25 bg-[#102f39] p-3 text-[#78e0ff]"
            : "rounded-lg border border-white/10 bg-[#0d1210] p-3 text-white"
      }
    >
      <p className="text-xs font-semibold opacity-75">{label}</p>
      <p className="mono mt-1 truncate text-sm font-black">{value}</p>
    </div>
  );
}

function DriverPanel({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0b110f] p-5 shell-shadow">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">{title}</p>
          <p className="mt-1 text-xs text-[#8ea198]">{subtitle}</p>
        </div>
        {icon}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function RecommendedStopPanel({
  stops,
  selectedType,
  selectedStop,
  onSelectType,
  onSelectStop,
  onLogFuel,
}: {
  stops: StopRecommendation[];
  selectedType: StopType;
  selectedStop?: StopRecommendation;
  onSelectType: (type: StopType) => void;
  onSelectStop: (id: string) => void;
  onLogFuel: () => void;
}) {
  const filtered = stops.filter((stop) => stop.type === selectedType);

  return (
    <DriverPanel
      title="Recommended Next Stop"
      subtitle={
        selectedStop
          ? `${selectedStop.name} - ${selectedStop.distanceAhead} mi ahead`
          : "Fuel, parking, and rest planning"
      }
      icon={<MapPin className="h-5 w-5 text-[#26d69b]" />}
    >
      <div className="grid grid-cols-3 gap-2">
        {(["fuel", "parking", "rest"] as StopType[]).map((type) => (
          <button
            key={type}
            onClick={() => onSelectType(type)}
            className={
              selectedType === type
                ? "rounded-lg bg-[#26d69b] px-3 py-2 text-xs font-black text-[#03120c]"
                : "rounded-lg border border-white/10 bg-[#0d1210] px-3 py-2 text-xs font-black text-[#8ea198] hover:border-[#26d69b]/35 hover:text-white"
            }
          >
            {type === "fuel" ? "Fuel" : type === "parking" ? "Parking" : "Rest"}
          </button>
        ))}
      </div>

      <StopMap stops={stops} selectedStop={selectedStop} />

      <div className="mt-3 grid gap-3">
        {filtered.map((stop) => (
          <StopRecommendationCard
            key={stop.id}
            stop={stop}
            selected={selectedStop?.id === stop.id}
            onSelect={() => onSelectStop(stop.id)}
            onLogFuel={onLogFuel}
          />
        ))}
      </div>
    </DriverPanel>
  );
}

function StopMap({
  stops,
  selectedStop,
}: {
  stops: StopRecommendation[];
  selectedStop?: StopRecommendation;
}) {
  return (
    <div className="soft-grid relative mt-3 h-[190px] overflow-hidden rounded-lg border border-white/10 bg-[#070908]">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 420 190"
        preserveAspectRatio="none"
      >
        <path
          d="M32 142 C88 72 160 162 224 91 C286 22 342 84 392 42"
          fill="none"
          stroke="rgba(218,255,237,0.13)"
          strokeWidth="17"
          strokeLinecap="round"
        />
        <path
          d="M32 142 C88 72 160 162 224 91 C286 22 342 84 392 42"
          fill="none"
          stroke="#26d69b"
          strokeWidth="4"
          strokeLinecap="round"
          className="route-dash"
        />
      </svg>
      <div className="absolute left-[6%] top-[68%] flex h-8 w-8 items-center justify-center rounded-lg bg-[#26d69b] text-[#03120c]">
        <Truck className="h-4 w-4" />
      </div>
      {stops.map((stop) => (
        <button
          key={stop.id}
          className={`absolute flex h-8 w-8 items-center justify-center rounded-lg border bg-[#0d1210] ${
            selectedStop?.id === stop.id
              ? "border-[#26d69b] text-[#26d69b]"
              : "border-white/16 text-[#8ea198]"
          }`}
          style={{ left: `${stop.mapX}%`, top: `${stop.mapY}%` }}
        >
          {stop.type === "fuel" ? (
            <Fuel className="h-4 w-4" />
          ) : stop.type === "parking" ? (
            <Truck className="h-4 w-4" />
          ) : (
            <ClipboardList className="h-4 w-4" />
          )}
        </button>
      ))}
      {selectedStop ? (
        <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-white/10 bg-[#0d1210]/90 p-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-black text-white">
              {selectedStop.name}
            </p>
            <Badge variant={selectedStop.hosFit === "fits" ? "green" : "amber"}>
              {selectedStop.hosFit}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[#8ea198]">
            {selectedStop.distanceAhead} mi ahead / {selectedStop.deviationMinutes} min deviation
          </p>
        </div>
      ) : null}
    </div>
  );
}

function StopRecommendationCard({
  stop,
  selected,
  onSelect,
  onLogFuel,
}: {
  stop: StopRecommendation;
  selected: boolean;
  onSelect: () => void;
  onLogFuel: () => void;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        selected
          ? "border-[#26d69b]/45 bg-[#102019]"
          : "border-white/10 bg-[#0d1210]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-white">{stop.name}</p>
          <p className="mt-1 text-xs text-[#8ea198]">
            {stop.city}, {stop.state} / {stop.distanceAhead} mi ahead
          </p>
        </div>
        <Badge variant={stop.confidence >= 90 ? "green" : "blue"}>
          {stop.confidence}% fit
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {stop.pricePerGallon ? (
          <StopMetric label="Fuel" value={`$${stop.pricePerGallon.toFixed(2)}`} />
        ) : null}
        {stop.parkingSpaces ? (
          <StopMetric label="Spaces" value={`${stop.parkingSpaces}`} />
        ) : null}
        <StopMetric label="Savings" value={stop.savings ? `$${stop.savings}` : "Time"} />
      </div>
      <p className="mt-3 text-xs leading-5 text-[#b8c8c0]">{stop.reason}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          onClick={onSelect}
          className="rounded-lg border border-white/10 bg-[#070908] px-3 py-2 text-xs font-black text-white hover:border-[#26d69b]/45"
        >
          View stop details
        </button>
        {stop.type === "fuel" ? (
          <button
            onClick={onLogFuel}
            className="rounded-lg bg-[#26d69b] px-3 py-2 text-xs font-black text-[#03120c] hover:bg-[#55f0b1]"
          >
            Log refuel stop
          </button>
        ) : (
          <button
            onClick={onSelect}
            className="rounded-lg bg-[#111a16] px-3 py-2 text-xs font-black text-white hover:bg-[#17231d]"
          >
            Select stop
          </button>
        )}
      </div>
    </div>
  );
}

function StopMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#070908] p-2">
      <p className="text-[10px] font-black uppercase text-[#8ea198]">{label}</p>
      <p className="mono mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function DriverDocumentSummary({ summary }: { summary: DocumentSummary }) {
  return (
    <div className="rounded-lg border border-[#26d69b]/20 bg-[#07100d] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">{summary.label}</p>
          <p className="mono mt-1 text-xs text-[#8ea198]">
            {summary.linkedLoad} / {formatDate(summary.uploadedAt)}
          </p>
        </div>
        <Badge variant={summary.readyForBilling ? "green" : "amber"}>
          {summary.readyForBilling ? "Billing ready" : "Trip packet"}
        </Badge>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#b8c8c0]">
        {summary.aiSummary}
      </p>
      <div className="mt-3 grid gap-2">
        {summary.extracted.slice(0, 3).map((item) => (
          <div
            key={`${summary.id}-${item.label}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0d1210] px-3 py-2"
          >
            <span className="text-[10px] font-black uppercase text-[#8ea198]">
              {item.label}
            </span>
            <span className="truncate text-xs font-black text-white">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReminderRow({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: string;
}) {
  const toneClass =
    tone === "green"
      ? "border-[#26d69b]/25 bg-[#102019] text-[#55f0b1]"
      : tone === "amber"
        ? "border-[#f5a524]/25 bg-[#241b0c] text-[#ffd27a]"
        : "border-[#53d7ff]/25 bg-[#102f39] text-[#78e0ff]";

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="flex items-start gap-3">
        {tone === "amber" ? (
          <AlertTriangle className="mt-0.5 h-4 w-4" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4" />
        )}
        <div>
          <p className="text-sm font-black text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-[#b8c8c0]">{text}</p>
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function DocRow({
  complete,
  label,
  action,
}: {
  complete: boolean;
  label: string;
  action?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0d1210] p-3">
      <div className="flex items-center gap-3">
        {complete ? (
          <CheckCircle2 className="h-5 w-5 text-[#26d69b]" />
        ) : (
          <ReceiptText className="h-5 w-5 text-[#8ea198]" />
        )}
        <span className="text-sm font-semibold text-white">{label}</span>
      </div>
      {action && !complete ? (
        <button
          onClick={action}
          className="inline-flex items-center gap-2 rounded-lg bg-[#26d69b] px-3 py-2 text-xs font-black text-[#03120c] hover:bg-[#55f0b1]"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload
        </button>
      ) : (
        <span className="text-xs font-semibold text-[#8ea198]">
          {complete ? "Complete" : "Pending"}
        </span>
      )}
    </div>
  );
}

function TimelineItem({
  complete,
  label,
}: {
  complete: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={
          complete
            ? "flex h-7 w-7 items-center justify-center rounded-lg bg-[#14362a] text-[#26d69b]"
            : "flex h-7 w-7 items-center justify-center rounded-lg bg-[#0d1210] text-[#8ea198]"
        }
      >
        <CheckCircle2 className="h-4 w-4" />
      </span>
      <span className="text-sm font-semibold text-white">{label}</span>
    </div>
  );
}
