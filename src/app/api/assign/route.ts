import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { parseSession, AUTH_COOKIE } from "@/lib/demo-auth";
import { createAssignmentRequest, getAssignmentQueue } from "@/lib/assignment-service";
import { prisma } from "@/lib/prisma";
import { calculateRoute, haversineDistance } from "@/lib/truckerpath";
import { evaluateDispatchEligibility, scoreDriverLoadPair } from "@/lib/grok";

export const dynamic = "force-dynamic";

const AssignSchema = z.object({
  driverId: z.string(),
  loadId: z.string(),
  aiScore: z.number(),
  aiReasoning: z.string().optional(),
  fuelPrice: z.number().default(4.2),
  driverPayPerHour: z.number().default(28),
  reassignedFromId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queue = await getAssignmentQueue({
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      driverId: searchParams.get("driverId") ?? undefined,
    });

    return NextResponse.json(queue);
  } catch (err) {
    console.error("[GET /api/assign]", err);
    return NextResponse.json({ error: "Failed to load assignment queue" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = parseSession(cookieStore.get(AUTH_COOKIE)?.value);
    const body = await req.json();
    const parsed = AssignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      driverId,
      loadId,
      aiScore,
      aiReasoning,
      fuelPrice,
      driverPayPerHour,
      reassignedFromId,
    } = parsed.data;

    const [driver, load] = await Promise.all([
      prisma.driver.findUnique({ where: { id: driverId } }),
      prisma.load.findUnique({ where: { id: loadId } }),
    ]);

    if (!driver || !load) {
      return NextResponse.json(
        { error: "Driver or load not found" },
        { status: 404 }
      );
    }

    const deadMiles = Math.round(
      haversineDistance(
        driver.latitude ?? 0,
        driver.longitude ?? 0,
        load.originLat,
        load.originLng
      )
    );

    const route = await calculateRoute({
      origin_lat: load.originLat,
      origin_lng: load.originLng,
      dest_lat: load.destLat,
      dest_lng: load.destLng,
      truck_height: driver.truckHeight,
      truck_weight: driver.truckWeight,
    });

    const scoreResult = await scoreDriverLoadPair({
      driver: {
        id: driver.id,
        name: driver.name,
        hosRemaining: driver.hosRemaining,
        deadMiles,
        onTimeRate: driver.onTimeRate,
        currentCity: `${driver.city}, ${driver.state}`,
        fuelLevel: driver.fuelLevel ?? 50,
        truckHeight: driver.truckHeight,
        truckWeight: driver.truckWeight,
      },
      load: {
        id: load.id,
        loadNumber: load.loadNumber,
        originCity: load.originCity,
        destCity: load.destCity,
        estimatedMiles: load.estimatedMiles,
        rate: load.rate,
        pickupDate: load.pickupDate,
        commodity: load.commodity,
        weight: load.weight,
      },
      route: {
        estimatedHours: route.estimated_hours,
        hasBridgeWarning: route.has_low_bridge,
        hasWeighStation: route.has_weigh_station,
        tollEstimate: route.toll_estimate,
      },
    });

    const eligibility = evaluateDispatchEligibility({
      hosRemaining: driver.hosRemaining,
      deadMiles,
      estimatedHours: route.estimated_hours,
      score: scoreResult,
    });

    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error: "Driver is not dispatch-eligible for this load",
          reasons: eligibility.reasons,
          requiredHosHours: eligibility.requiredHosHours,
          aiScore: scoreResult.score,
          recommendation: scoreResult.recommendation,
        },
        { status: 409 }
      );
    }

    const result = await createAssignmentRequest({
      driverId,
      loadId,
      aiScore,
      aiReasoning,
      fuelPrice,
      driverPayPerHour,
      assignedBy: session?.userId,
      reassignedFromId,
    });

    return NextResponse.json({
      success: true,
      assignment: result.assignment,
      cost: result.cost,
      sms: result.smsResult,
    });
  } catch (err) {
    console.error("[POST /api/assign]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Assignment failed" },
      { status: 500 }
    );
  }
}
