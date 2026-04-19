const GROK_API_URL =
  process.env.GROK_API_URL || "https://api.x.ai/v1/chat/completions";
const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY || "";
const GROK_MODEL = process.env.GROK_MODEL || "grok-2-latest";
const hasGrokKey =
  Boolean(GROK_API_KEY) &&
  !GROK_API_KEY.includes("...") &&
  !GROK_API_KEY.toLowerCase().includes("your-");

export interface DriverScoringInput {
  driver: {
    id: string;
    name: string;
    hosRemaining: number;
    deadMiles: number;
    onTimeRate: number;
    currentCity: string;
    fuelLevel: number;
    truckHeight: number;
    truckWeight: number;
  };
  load: {
    id: string;
    loadNumber: string;
    originCity: string;
    destCity: string;
    estimatedMiles: number;
    rate: number;
    pickupDate: Date;
    commodity: string;
    weight: number;
  };
  route: {
    estimatedHours: number;
    hasBridgeWarning: boolean;
    hasWeighStation: boolean;
    tollEstimate: number;
  };
}

export interface DriverScore {
  driverId: string;
  score: number;
  hosScore: number;
  deadMileScore: number;
  onTimeScore: number;
  complianceScore: number;
  complianceStatus: "ok" | "warn" | "critical";
  complianceReason: string | null;
  reasoning: string;
  recommendation: "assign" | "marginal" | "skip";
}

export interface CostAnalysis {
  revenue: number;
  fuelCost: number;
  deadheadFuelCost: number;
  driverPay: number;
  tolls: number;
  netMargin: number;
  marginPercent: number;
  verdict: "accept" | "marginal" | "reject";
  reasoning: string;
}

type GrokResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

async function callGrokJson<T>({
  system,
  prompt,
  maxTokens = 512,
}: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<T> {
  if (!hasGrokKey) {
    throw new Error("GROK_API_KEY is not configured");
  }

  const res = await fetch(GROK_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      temperature: 0.1,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Grok request failed: ${res.status} ${detail}`);
  }

  const data = (await res.json()) as GrokResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Grok returned an empty response");
  }

  return JSON.parse(content.trim()) as T;
}

export async function scoreDriverLoadPair(
  input: DriverScoringInput
): Promise<DriverScore> {
  const { driver, load, route } = input;

  const hosTripRequired = route.estimatedHours + 1.5;
  const hosStatus =
    driver.hosRemaining < 2
      ? "CRITICAL"
      : driver.hosRemaining < hosTripRequired
        ? "WARNING"
        : "OK";

  const systemPrompt = `You are FleetIQ, an AI dispatch optimizer for a trucking fleet.
Score driver-load pairs and return structured JSON only. Do not include markdown.`;

  const userPrompt = `Score this driver-load pair and return JSON.

DRIVER:
- Name: ${driver.name}
- HOS remaining: ${driver.hosRemaining}h
- Dead miles to pickup: ${driver.deadMiles} miles
- On-time rate: ${(driver.onTimeRate * 100).toFixed(0)}%
- Truck height: ${driver.truckHeight}ft, weight: ${driver.truckWeight}lbs
- Fuel level: ${driver.fuelLevel}%
- Current location: ${driver.currentCity}

LOAD:
- Load #: ${load.loadNumber}
- Route: ${load.originCity} to ${load.destCity}
- Distance: ${load.estimatedMiles} miles
- Rate: $${load.rate}
- Estimated drive time: ${route.estimatedHours}h
- HOS required: about ${hosTripRequired.toFixed(1)}h
- HOS status: ${hosStatus}
- Bridge warning: ${route.hasBridgeWarning}
- Weigh station: ${route.hasWeighStation}
- Commodity: ${load.commodity}, ${load.weight}lbs

Return this exact JSON structure:
{
  "score": <0-100 integer, weighted: HOS 35%, dead miles 25%, on-time 25%, compliance 15%>,
  "hosScore": <0-100>,
  "deadMileScore": <0-100, 100=0 miles, 0=300+ miles>,
  "onTimeScore": <0-100>,
  "complianceScore": <0-100>,
  "complianceStatus": <"ok"|"warn"|"critical">,
  "complianceReason": <null or string explaining flag>,
  "reasoning": <2-sentence dispatcher explanation>,
  "recommendation": <"assign"|"marginal"|"skip">
}`;

  try {
    const parsed = await callGrokJson<Omit<DriverScore, "driverId">>({
      system: systemPrompt,
      prompt: userPrompt,
    });

    return {
      driverId: driver.id,
      ...parsed,
    };
  } catch (err) {
    console.error("[Grok] scoreDriverLoadPair failed:", err);
    return fallbackScore(input, hosStatus);
  }
}

export async function analyzeCost(params: {
  rate: number;
  loadedMiles: number;
  deadMiles: number;
  fuelPrice: number;
  driverPayPerHour: number;
  mpg?: number;
  speedMph?: number;
}): Promise<CostAnalysis> {
  const {
    rate,
    loadedMiles,
    deadMiles,
    fuelPrice,
    driverPayPerHour,
    mpg = 6.5,
    speedMph = 55,
  } = params;

  const fuelCost = Math.round((loadedMiles / mpg) * fuelPrice);
  const deadheadFuelCost = Math.round((deadMiles / mpg) * fuelPrice);
  const hours = loadedMiles / speedMph;
  const driverPay = Math.round(hours * driverPayPerHour);
  const tolls = Math.round(loadedMiles * 0.06);
  const netMargin = rate - fuelCost - deadheadFuelCost - driverPay - tolls;
  const marginPercent = (netMargin / rate) * 100;

  const prompt = `A dispatcher is deciding whether to accept a load. Give a 1-2 sentence recommendation.

Revenue: $${rate}
Fuel: -$${fuelCost} (${loadedMiles} mi at $${fuelPrice}/gal, ${mpg} mpg)
Deadhead fuel: -$${deadheadFuelCost} (${deadMiles} dead miles)
Driver pay: -$${driverPay} (${hours.toFixed(1)}h at $${driverPayPerHour}/hr)
Tolls: -$${tolls}
Net margin: $${netMargin} (${marginPercent.toFixed(1)}%)

Return JSON only: { "verdict": "accept"|"marginal"|"reject", "reasoning": "..." }`;

  let verdict: "accept" | "marginal" | "reject" =
    marginPercent > 35 ? "accept" : marginPercent > 15 ? "marginal" : "reject";
  let reasoning =
    marginPercent > 35
      ? `Strong ${marginPercent.toFixed(1)}% margin - recommend accepting.`
      : marginPercent > 15
        ? `Thin ${marginPercent.toFixed(1)}% margin - negotiate rate or find a closer driver.`
        : `Low margin - do not dispatch without a rate adjustment or lower deadhead.`;

  try {
    const parsed = await callGrokJson<{
      verdict?: "accept" | "marginal" | "reject";
      reasoning?: string;
    }>({
      system:
        "You are a trucking P&L analyst. Return only valid JSON, no markdown.",
      prompt,
      maxTokens: 256,
    });
    verdict = parsed.verdict || verdict;
    reasoning = parsed.reasoning || reasoning;
  } catch (err) {
    console.error("[Grok] analyzeCost failed:", err);
  }

  return {
    revenue: rate,
    fuelCost,
    deadheadFuelCost,
    driverPay,
    tolls,
    netMargin,
    marginPercent: Math.round(marginPercent * 10) / 10,
    verdict,
    reasoning,
  };
}

function fallbackScore(
  input: DriverScoringInput,
  hosStatus: string
): DriverScore {
  const { driver, route } = input;

  const hosScore = Math.min(
    100,
    Math.max(0, ((driver.hosRemaining - route.estimatedHours) / 4) * 100)
  );
  const deadMileScore = Math.max(0, 100 - driver.deadMiles * 0.4);
  const onTimeScore = driver.onTimeRate * 100;
  const complianceScore =
    hosStatus === "CRITICAL" ? 0 : hosStatus === "WARNING" ? 50 : 100;

  const score = Math.round(
    hosScore * 0.35 +
      deadMileScore * 0.25 +
      onTimeScore * 0.25 +
      complianceScore * 0.15
  );

  return {
    driverId: driver.id,
    score: Math.max(0, Math.min(100, score)),
    hosScore: Math.round(hosScore),
    deadMileScore: Math.round(deadMileScore),
    onTimeScore: Math.round(onTimeScore),
    complianceScore: Math.round(complianceScore),
    complianceStatus:
      hosStatus === "CRITICAL"
        ? "critical"
        : hosStatus === "WARNING"
          ? "warn"
          : "ok",
    complianceReason:
      hosStatus === "CRITICAL"
        ? `Only ${driver.hosRemaining}h HOS remaining - cannot complete trip`
        : hosStatus === "WARNING"
          ? `HOS is tight at ${driver.hosRemaining}h - monitor closely`
          : null,
    reasoning: `Score ${score}/100. ${driver.deadMiles} dead miles to pickup, ${driver.hosRemaining}h HOS available, and ${(driver.onTimeRate * 100).toFixed(0)}% on-time reliability.`,
    recommendation:
      score >= 75 ? "assign" : score >= 45 ? "marginal" : "skip",
  };
}
