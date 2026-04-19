import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeCost } from "@/lib/grok";

export const dynamic = "force-dynamic";

const CostSchema = z.object({
  rate: z.number().min(0),
  loadedMiles: z.number().min(1),
  deadMiles: z.number().min(0).default(0),
  fuelPrice: z.number().min(0).default(4.2),
  driverPayPerHour: z.number().min(0).default(28),
  mpg: z.number().default(6.5),
  speedMph: z.number().default(55),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid params", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await analyzeCost(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/cost]", err);
    return NextResponse.json(
      { error: "Cost calculation failed" },
      { status: 500 }
    );
  }
}
