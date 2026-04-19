export interface IntelligenceLoad {
  id: string;
  loadNumber: string;
  status: string;
  originCity: string;
  originState: string;
  originLat?: number | null;
  originLng?: number | null;
  destCity: string;
  destState: string;
  destLat?: number | null;
  destLng?: number | null;
  rate: number;
  estimatedMiles: number;
  shipper: string;
  commodity: string;
  weight?: number | null;
  pickupDate?: string;
  deliveryDate?: string;
}

export interface IntelligenceDriver {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  hosRemaining: number;
  status: string;
  truckNumber: string;
  fuelLevel?: number | null;
  onTimeRate: number;
  totalTrips?: number;
}

export interface ProfitabilityResult {
  revenue: number;
  fuelCost: number;
  deadheadCost: number;
  driverCost: number;
  tollCost: number;
  bufferCost: number;
  totalCost: number;
  netMargin: number;
  marginPercent: number;
  fuelPrice: number;
  estimatedGallons: number;
  loadedMiles: number;
  deadheadMiles: number;
  verdict: "accept" | "review" | "reject";
  explanation: string;
}

export interface DriverProfitability {
  driver: IntelligenceDriver;
  profit: ProfitabilityResult;
  pickupEtaMinutes: number;
  hosFit: "clear" | "tight" | "blocked";
  recommendation: string;
}

export interface CopilotResponse {
  answer: string;
  supportingFacts: string[];
  recommendation: string;
  relatedActions: string[];
}

export type StopType = "fuel" | "parking" | "rest";

export interface StopRecommendation {
  id: string;
  type: StopType;
  name: string;
  city: string;
  state: string;
  distanceAhead: number;
  deviationMinutes: number;
  pricePerGallon?: number;
  savings?: number;
  parkingSpaces?: number;
  confidence: number;
  hosFit: "fits" | "tight" | "misses";
  truckSafe: boolean;
  reason: string;
  mapX: number;
  mapY: number;
}

export type DocumentType = "bol" | "pod" | "fuelReceipt" | "other";

export interface DocumentSummary {
  id: string;
  type: DocumentType;
  label: string;
  status: "complete" | "pending" | "review";
  uploadedAt: string;
  linkedLoad: string;
  extracted: Array<{ label: string; value: string }>;
  aiSummary: string;
  readyForBilling: boolean;
}

export function calculateDeadheadMiles(
  driver: IntelligenceDriver,
  load: IntelligenceLoad
) {
  if (
    typeof driver.latitude === "number" &&
    typeof driver.longitude === "number" &&
    typeof load.originLat === "number" &&
    typeof load.originLng === "number"
  ) {
    return Math.round(
      distanceMiles(
        driver.latitude,
        driver.longitude,
        load.originLat,
        load.originLng
      )
    );
  }

  const sameState = driver.state && load.originState && driver.state === load.originState;
  const sameCity = driver.city && driver.city === load.originCity;
  if (sameCity) return 8;
  if (sameState) return 82;
  return 165;
}

export function calculateProfitability(
  load: IntelligenceLoad,
  deadheadMiles: number,
  options?: {
    fuelPrice?: number;
    mpg?: number;
    driverPayPerHour?: number;
    speedMph?: number;
    bufferPercent?: number;
  }
): ProfitabilityResult {
  const fuelPrice = options?.fuelPrice ?? laneFuelPrice(load);
  const mpg = options?.mpg ?? 6.45;
  const speedMph = options?.speedMph ?? 55;
  const driverPayPerHour = options?.driverPayPerHour ?? 31;
  const bufferPercent = options?.bufferPercent ?? 0.035;
  const loadedMiles = Math.round(load.estimatedMiles);
  const estimatedGallons = Math.round(((loadedMiles + deadheadMiles) / mpg) * 10) / 10;
  const fuelCost = Math.round((loadedMiles / mpg) * fuelPrice);
  const deadheadCost = Math.round((deadheadMiles / mpg) * fuelPrice + deadheadMiles * 0.18);
  const driverCost = Math.round((loadedMiles / speedMph) * driverPayPerHour);
  const tollCost = Math.round(loadedMiles * tollRate(load));
  const bufferCost = Math.round(load.rate * bufferPercent);
  const totalCost = fuelCost + deadheadCost + driverCost + tollCost + bufferCost;
  const netMargin = Math.round(load.rate - totalCost);
  const marginPercent = load.rate > 0 ? Math.round((netMargin / load.rate) * 1000) / 10 : 0;
  const verdict = marginPercent >= 27 ? "accept" : marginPercent >= 14 ? "review" : "reject";

  const explanation =
    verdict === "accept"
      ? `This load is profitable because deadhead is controlled at ${deadheadMiles} miles, fuel is modeled at $${fuelPrice.toFixed(2)}/gal, and margin remains above the fleet target.`
      : verdict === "review"
        ? `Review this load because deadhead and operating cost leave only a ${marginPercent.toFixed(1)}% margin. A closer driver or rate bump would improve the lane.`
        : `Reject or renegotiate this load because projected margin is ${marginPercent.toFixed(1)}%, below the demo threshold after fuel, driver cost, tolls, and buffer.`;

  return {
    revenue: load.rate,
    fuelCost,
    deadheadCost,
    driverCost,
    tollCost,
    bufferCost,
    totalCost,
    netMargin,
    marginPercent,
    fuelPrice,
    estimatedGallons,
    loadedMiles,
    deadheadMiles,
    verdict,
    explanation,
  };
}

export function buildDriverProfitability(
  load: IntelligenceLoad,
  drivers: IntelligenceDriver[]
): DriverProfitability[] {
  return drivers
    .filter((driver) => driver.status === "AVAILABLE" || driver.status === "RESTING")
    .map((driver) => {
      const deadheadMiles = calculateDeadheadMiles(driver, load);
      const profit = calculateProfitability(load, deadheadMiles);
      const pickupEtaMinutes = Math.max(18, Math.round((deadheadMiles / 48) * 60));
      const driveHours = load.estimatedMiles / 55;
      const hosFit: DriverProfitability["hosFit"] =
        driver.hosRemaining < Math.min(4, driveHours * 0.35)
          ? "blocked"
          : driver.hosRemaining < Math.min(8, driveHours * 0.75)
            ? "tight"
            : "clear";
      const recommendation =
        hosFit === "blocked"
          ? "Blocked by HOS"
          : profit.verdict === "accept"
            ? "Best margin candidate"
            : profit.verdict === "review"
              ? "Negotiate or review"
              : "Do not assign";

      return {
        driver,
        profit,
        pickupEtaMinutes,
        hosFit,
        recommendation,
      };
    })
    .sort((a, b) => {
      const hosPenalty = (item: DriverProfitability) =>
        item.hosFit === "blocked" ? -9999 : item.hosFit === "tight" ? -500 : 0;
      return (
        b.profit.netMargin +
        hosPenalty(b) +
        b.driver.onTimeRate * 240 -
        (a.profit.netMargin + hosPenalty(a) + a.driver.onTimeRate * 240)
      );
    });
}

export function getMarketOutcomeScenarios(loads: IntelligenceLoad[]) {
  const base = loads[0];
  const profitable = base
    ? calculateProfitability({ ...base, rate: Math.max(base.rate, 2850) }, 18)
    : null;
  const borderline = base
    ? calculateProfitability(
        {
          ...base,
          loadNumber: "SPOT-219",
          rate: 1650,
          estimatedMiles: 725,
          originCity: "El Paso",
          originState: "TX",
          destCity: "Oklahoma City",
          destState: "OK",
          commodity: "Dry Van Freight",
        },
        142
      )
    : null;
  const bad = base
    ? calculateProfitability(
        {
          ...base,
          loadNumber: "SPOT-404",
          rate: 980,
          estimatedMiles: 640,
          originCity: "Yuma",
          originState: "AZ",
          destCity: "Reno",
          destState: "NV",
          commodity: "Low-rate Backhaul",
        },
        210
      )
    : null;

  return [
    profitable && { label: "High-profit match", loadNumber: base.loadNumber, result: profitable },
    borderline && { label: "Borderline quote", loadNumber: "SPOT-219", result: borderline },
    bad && { label: "Bad load example", loadNumber: "SPOT-404", result: bad },
  ].filter(Boolean) as Array<{
    label: string;
    loadNumber: string;
    result: ProfitabilityResult;
  }>;
}

export function buildCopilotResponse({
  prompt,
  loads,
  drivers,
  alerts,
}: {
  prompt: string;
  loads: IntelligenceLoad[];
  drivers: IntelligenceDriver[];
  alerts: Array<{ severity: string; title: string; message: string }>;
}): CopilotResponse {
  const normalized = prompt.toLowerCase();
  const pendingLoads = loads.filter((load) => load.status === "PENDING");
  const pendingResponses = loads.filter((load) => load.status === "PENDING_RESPONSE");
  const reassignmentLoads = loads.filter((load) => load.status === "REASSIGNMENT_NEEDED");
  const readyDrivers = drivers.filter(
    (driver) => driver.status === "AVAILABLE" && driver.hosRemaining >= 6
  );
  const scored = pendingLoads.flatMap((load) =>
    buildDriverProfitability(load, readyDrivers).slice(0, 1).map((match) => ({
      load,
      match,
    }))
  );
  const best = scored.sort((a, b) => b.match.profit.netMargin - a.match.profit.netMargin)[0];
  const atRisk = drivers.filter((driver) => driver.hosRemaining < 4 || driver.status !== "AVAILABLE");

  if (normalized.includes("reject") || normalized.includes("bad load")) {
    const weak = scored
      .filter((item) => item.match.profit.verdict !== "accept")
      .sort((a, b) => a.match.profit.marginPercent - b.match.profit.marginPercent)[0];
    const rejectScenario = getMarketOutcomeScenarios(loads).find(
      (scenario) => scenario.result.verdict === "reject"
    );
    if (!weak && rejectScenario) {
      return {
        answer: `${rejectScenario.loadNumber} should be rejected or renegotiated. It falls below the margin threshold after modeled fuel, deadhead, driver cost, tolls, and buffer.`,
        supportingFacts: [
          `Projected net margin is $${rejectScenario.result.netMargin.toLocaleString()}.`,
          `Margin is ${rejectScenario.result.marginPercent.toFixed(1)}%, below the 14% reject threshold.`,
          `Deadhead is ${rejectScenario.result.deadheadMiles} miles before revenue begins.`,
        ],
        recommendation:
          "Reject this quote unless the broker improves the rate or a closer truck becomes available.",
        relatedActions: ["Open profitability panel", "Filter review loads", "Check driver readiness"],
      };
    }
    return {
      answer: weak
        ? `${weak.load.loadNumber} needs review first. The best current driver match leaves only ${weak.match.profit.marginPercent.toFixed(1)}% margin.`
        : "No pending live load is below the reject threshold right now.",
      supportingFacts: weak
        ? [
            `${weak.match.driver.name} has ${weak.match.profit.deadheadMiles} deadhead miles to pickup.`,
            `Projected net margin is $${weak.match.profit.netMargin.toLocaleString()}.`,
            `Modeled fuel price is $${weak.match.profit.fuelPrice.toFixed(2)}/gal.`,
          ]
        : [
            `${pendingLoads.length} pending loads evaluated.`,
            `${readyDrivers.length} drivers are dispatch-ready.`,
          ],
      recommendation: weak
        ? "Negotiate rate or wait for a closer truck before accepting."
        : "Focus on the highest-margin pending load and keep monitoring HOS alerts.",
      relatedActions: ["Open profitability panel", "Filter review loads", "Check driver readiness"],
    };
  }

  if (
    normalized.includes("pending too long") ||
    normalized.includes("waiting") ||
    normalized.includes("pending response")
  ) {
    return {
      answer: `${pendingResponses.length} loads are currently waiting for driver action. Prioritize reminders for requests older than 30 minutes and prep backup drivers now.`,
      supportingFacts: [
        pendingResponses[0]
          ? `${pendingResponses[0].loadNumber} is waiting: ${pendingResponses[0].originCity} to ${pendingResponses[0].destCity}.`
          : "No pending-response loads are currently in queue.",
        `${readyDrivers.length} drivers are currently available for potential reassignment.`,
      ],
      recommendation:
        "Send reminder notifications to pending drivers, then pre-stage a reassignment for high-priority lanes.",
      relatedActions: ["Open assignment queue", "Send reassignment", "Review available drivers"],
    };
  }

  if (
    normalized.includes("need reassignment") ||
    normalized.includes("reassignment") ||
    normalized.includes("declined")
  ) {
    const backupDriver = readyDrivers[0];
    return {
      answer: `${reassignmentLoads.length} loads need reassignment right now.${backupDriver ? ` ${backupDriver.name} is the strongest immediate backup based on availability and HOS.` : ""}`,
      supportingFacts: [
        reassignmentLoads[0]
          ? `${reassignmentLoads[0].loadNumber}: ${reassignmentLoads[0].originCity} to ${reassignmentLoads[0].destCity}.`
          : "No reassignment-needed loads detected.",
        backupDriver
          ? `${backupDriver.name}: ${backupDriver.hosRemaining}h HOS, ${(backupDriver.onTimeRate * 100).toFixed(0)}% on-time.`
          : "No backup driver currently available.",
      ],
      recommendation:
        "Move reassignment-needed loads to the top of dispatch queue and send new requests immediately.",
      relatedActions: ["Open assignment queue", "Score selected load", "Notify dispatcher"],
    };
  }

  if (normalized.includes("ready") || normalized.includes("available")) {
    return {
      answer: `${readyDrivers.length} drivers are ready now with at least 6 HOS hours and available duty status.`,
      supportingFacts: readyDrivers
        .slice(0, 4)
        .map(
          (driver) =>
            `${driver.name} in ${driver.city ?? "unknown"}, ${driver.state ?? ""}: ${driver.hosRemaining} HOS hours, ${Math.round((driver.fuelLevel ?? 0))}% fuel.`
        ),
      recommendation: "Use the highest-HOS drivers for long lanes and keep low-HOS drivers on local or rest plans.",
      relatedActions: ["Open driver list", "Show HOS risks", "Score selected load"],
    };
  }

  if (normalized.includes("risk") || normalized.includes("alert") || normalized.includes("hos")) {
    return {
      answer: `${atRisk.length} drivers or trips need attention based on HOS or duty status.`,
      supportingFacts: [
        ...atRisk.slice(0, 3).map((driver) => `${driver.name}: ${driver.hosRemaining}h HOS, status ${driver.status}.`),
        ...alerts.slice(0, 2).map((alert) => `${alert.severity}: ${alert.title}`),
      ],
      recommendation: "Do not assign low-HOS drivers to long lanes. Use rest planning or local work until the legal window resets.",
      relatedActions: ["Open compliance tab", "Review HOS warnings", "Find alternate driver"],
    };
  }

  if (normalized.includes("dallas")) {
    const dallasLoads = pendingLoads.filter(
      (load) => load.destCity.toLowerCase().includes("dallas") || load.originCity.toLowerCase().includes("dallas")
    );
    return {
      answer: dallasLoads.length
        ? `${dallasLoads[0].loadNumber} is the current Dallas-related opportunity. ${readyDrivers[0]?.name ?? "The top ready driver"} is the best available fit.`
        : "No active Dallas-origin load is pending, but one Dallas destination load can be scored from the profitability tab.",
      supportingFacts: [
        `${readyDrivers.length} ready drivers meet the HOS threshold.`,
        dallasLoads[0]
          ? `${dallasLoads[0].originCity} to ${dallasLoads[0].destCity}, $${dallasLoads[0].rate.toLocaleString()} rate.`
          : "No Dallas-origin pending load found in the current queue.",
      ],
      recommendation: "Open the Dallas lane and compare deadhead before accepting.",
      relatedActions: ["View lane", "Open profitability panel", "Ask about best driver"],
    };
  }

  return {
    answer: best
      ? `${best.match.driver.name} should take ${best.load.loadNumber}. This pairing has the strongest projected margin and a workable HOS profile.`
      : "No pending load has enough available driver data to make a dispatch recommendation yet.",
    supportingFacts: best
      ? [
          `${best.match.driver.name} is ${best.match.profit.deadheadMiles} miles from pickup.`,
          `Net margin is $${best.match.profit.netMargin.toLocaleString()} (${best.match.profit.marginPercent.toFixed(1)}%).`,
          `${best.match.driver.hosRemaining} HOS hours available and ${(best.match.driver.onTimeRate * 100).toFixed(0)}% on-time history.`,
        ]
      : ["No eligible pending load/driver pair found."],
    recommendation: best
      ? "Assign this pair if broker timing still holds, then send the trip to the driver workflow."
      : "Refresh load and driver data, then rerun scoring.",
    relatedActions: ["Assign driver", "Open profitability panel", "View route map"],
  };
}

export function getStopRecommendations({
  activeTrip,
  driverInfo,
  progress,
}: {
  activeTrip: {
    loadNumber: string;
    originCity: string;
    originState: string;
    destCity: string;
    destState: string;
    estimatedMiles: number;
  };
  driverInfo: { hosRemaining: number; fuelLevel: number | null };
  progress: number;
}): StopRecommendation[] {
  const remainingMiles = Math.max(0, activeTrip.estimatedMiles * (1 - progress / 100));
  const lowFuel = (driverInfo.fuelLevel ?? 60) < 65;
  const hosTight = driverInfo.hosRemaining < 7;

  return [
    {
      id: "fuel-loves",
      type: "fuel",
      name: "Love's Travel Stop",
      city: activeTrip.originState === "AZ" ? "Lordsburg" : "El Reno",
      state: activeTrip.originState === "AZ" ? "NM" : "OK",
      distanceAhead: lowFuel ? 42 : 86,
      deviationMinutes: 4,
      pricePerGallon: 4.12,
      savings: 37,
      parkingSpaces: 18,
      confidence: 94,
      hosFit: "fits",
      truckSafe: true,
      reason: "Cheapest modeled diesel on the route and only a four-minute deviation from the truck-safe path.",
      mapX: 31,
      mapY: 58,
    },
    {
      id: "parking-pilot",
      type: "parking",
      name: "Pilot Flying J",
      city: remainingMiles > 500 ? "Fort Stockton" : "Kingman",
      state: remainingMiles > 500 ? "TX" : "AZ",
      distanceAhead: hosTight ? 67 : 124,
      deviationMinutes: 7,
      parkingSpaces: hosTight ? 34 : 21,
      confidence: hosTight ? 91 : 82,
      hosFit: hosTight ? "fits" : "tight",
      truckSafe: true,
      reason: hosTight
        ? "Best match for your upcoming HOS break window with strong parking availability."
        : "Good parking backup if receiver timing slips later in the route.",
      mapX: 58,
      mapY: 35,
    },
    {
      id: "rest-state",
      type: "rest",
      name: "State Rest Area",
      city: activeTrip.destState === "TX" ? "Van Horn" : "Needles",
      state: activeTrip.destState === "TX" ? "TX" : "CA",
      distanceAhead: 38,
      deviationMinutes: 0,
      parkingSpaces: 11,
      confidence: 78,
      hosFit: "fits",
      truckSafe: true,
      reason: "On-route rest option with no route deviation and a safe place for a short compliance break.",
      mapX: 43,
      mapY: 46,
    },
  ];
}

export function buildDocumentSummary({
  type,
  loadNumber,
  origin,
  destination,
}: {
  type: DocumentType;
  loadNumber: string;
  origin: string;
  destination: string;
}): DocumentSummary {
  const uploadedAt = new Date().toISOString();
  const id = `${type}-${Date.now()}`;

  if (type === "fuelReceipt") {
    return {
      id,
      type,
      label: "Fuel receipt",
      status: "complete",
      uploadedAt,
      linkedLoad: loadNumber,
      readyForBilling: true,
      extracted: [
        { label: "Vendor", value: "Love's Travel Stop" },
        { label: "Location", value: "Lordsburg, NM" },
        { label: "Amount", value: "$486.20" },
        { label: "Gallons", value: "118.0" },
        { label: "Linked trip", value: loadNumber },
      ],
      aiSummary:
        "Fuel receipt is readable, matched to the active trip, and ready for settlement review.",
    };
  }

  if (type === "pod") {
    return {
      id,
      type,
      label: "Proof of Delivery",
      status: "complete",
      uploadedAt,
      linkedLoad: loadNumber,
      readyForBilling: true,
      extracted: [
        { label: "Delivery", value: "Completed" },
        { label: "Receiver", value: destination },
        { label: "Signature", value: "Detected" },
        { label: "Timestamp", value: formatDateTime(uploadedAt) },
        { label: "Load", value: loadNumber },
      ],
      aiSummary:
        "POD includes receiver confirmation and signature. Billing package can be released.",
    };
  }

  if (type === "bol") {
    return {
      id,
      type,
      label: "Bill of Lading",
      status: "complete",
      uploadedAt,
      linkedLoad: loadNumber,
      readyForBilling: false,
      extracted: [
        { label: "Origin", value: origin },
        { label: "Destination", value: destination },
        { label: "Load", value: loadNumber },
        { label: "Shipper", value: "Matched from rate confirmation" },
        { label: "Completeness", value: "Required fields found" },
      ],
      aiSummary:
        "BOL is complete and linked to the dispatch record. POD is still required before final billing.",
    };
  }

  return {
    id,
    type,
    label: "Other trip document",
    status: "review",
    uploadedAt,
    linkedLoad: loadNumber,
    readyForBilling: false,
    extracted: [
      { label: "Document type", value: "Trip support" },
      { label: "Load", value: loadNumber },
      { label: "Status", value: "Needs operations review" },
    ],
    aiSummary:
      "Document was attached to the trip record. Operations should review before settlement.",
  };
}

export function getDemoDocumentHistory(loads: IntelligenceLoad[]): DocumentSummary[] {
  const first = loads[0];
  const second = loads[1] ?? first;
  if (!first) return [];

  return [
    {
      ...buildDocumentSummary({
        type: "fuelReceipt",
        loadNumber: first.loadNumber,
        origin: `${first.originCity}, ${first.originState}`,
        destination: `${first.destCity}, ${first.destState}`,
      }),
      id: "demo-fuel-receipt",
      uploadedAt: new Date(Date.now() - 1000 * 60 * 46).toISOString(),
    },
    {
      ...buildDocumentSummary({
        type: "pod",
        loadNumber: second.loadNumber,
        origin: `${second.originCity}, ${second.originState}`,
        destination: `${second.destCity}, ${second.destState}`,
      }),
      id: "demo-pod",
      uploadedAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    },
  ];
}

export function getDocumentReminderText({
  status,
  pickupComplete,
  docs,
}: {
  status: string;
  pickupComplete: boolean;
  docs: { bol: boolean; fuelReceipt: boolean; pod: boolean; other: boolean };
}) {
  if (pickupComplete && !docs.bol) {
    return "Pickup is complete. Upload the BOL so dispatch can validate shipper details.";
  }
  if (!docs.fuelReceipt) {
    return "Fuel receipt is still pending. Upload it after the next refuel to keep billing clean.";
  }
  if (status === "DELIVERED" && !docs.pod) {
    return "Delivery is complete. Submit POD now so the billing packet can be released.";
  }
  const pending = Object.values(docs).filter((complete) => !complete).length;
  return pending
    ? `${pending} document item${pending === 1 ? "" : "s"} still pending before trip closeout.`
    : "All required trip documents are complete.";
}

function laneFuelPrice(load: IntelligenceLoad) {
  if (load.destState === "CA" || load.originState === "CA") return 4.86;
  if (load.destState === "CO") return 4.38;
  if (load.destState === "TX") return 4.08;
  return 4.22;
}

function tollRate(load: IntelligenceLoad) {
  if (load.destState === "CA") return 0.07;
  if (load.destState === "CO") return 0.09;
  if (load.destState === "TX") return 0.055;
  return 0.06;
}

function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
