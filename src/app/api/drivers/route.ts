import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { haversineDistance } from "@/lib/truckerpath";
import { evaluateDispatchEligibility, scoreDriverLoadPair } from "@/lib/grok";
import { calculateRoute } from "@/lib/truckerpath";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const loadId = searchParams.get("loadId");

    const drivers = await prisma.driver.findMany({
      orderBy: { name: "asc" },
    });

    if (!loadId) {
      return NextResponse.json({ drivers });
    }

    // Load requested - score each driver against it.
    const load = await prisma.load.findUnique({ where: { id: loadId } });
    if (!load) {
      return NextResponse.json({ error: "Load not found" }, { status: 404 });
    }

    const scoredDrivers = await Promise.all(
      drivers.map(async (driver) => {
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

        return {
          id: driver.id,
          name: driver.name,
          city: driver.city,
          state: driver.state,
          hosRemaining: driver.hosRemaining,
          status: driver.status,
          truckNumber: driver.truckNumber,
          fuelLevel: driver.fuelLevel,
          onTimeRate: driver.onTimeRate,
          totalTrips: driver.totalTrips,
          deadMiles,
          aiScore: scoreResult.score,
          eligibleForDispatch: eligibility.eligible,
          dispatchBlockReasons: eligibility.reasons,
          requiredHosHours: eligibility.requiredHosHours,
          ...scoreResult,
        };
      })
    );

    // Rank dispatch-eligible matches first, then by score and deadhead.
    scoredDrivers.sort((a, b) => {
      if (a.eligibleForDispatch !== b.eligibleForDispatch) {
        return Number(b.eligibleForDispatch) - Number(a.eligibleForDispatch);
      }
      if (b.aiScore !== a.aiScore) {
        return b.aiScore - a.aiScore;
      }
      return a.deadMiles - b.deadMiles;
    });

    const rankedDrivers = scoredDrivers.map((driver, index) => ({
      ...driver,
      recommendationRank: index + 1,
    }));

    return NextResponse.json({ drivers: rankedDrivers, load });
  } catch (err) {
    console.error("[GET /api/drivers]", err);
    return NextResponse.json(
      { error: "Failed to fetch drivers" },
      { status: 500 }
    );
  }
}
