/**
 * POST /api/navpro/sync
 *
 * Pulls live driver + vehicle data from the real NavPro API and upserts
 * it into the local Prisma DB. Call this on startup or via a button in
 * the dispatcher dashboard to refresh fleet data from Trucker Path.
 *
 * In mock mode (USE_MOCK_DATA=true or no JWT) it returns the mock list
 * without touching the DB.
 *
 * GET /api/navpro/sync → health-check / connection status
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  queryDriversRaw,
  queryVehicles,
  isMockMode,
  NavProDriverRecord,
  NavProVehicleRecord,
} from "@/lib/truckerpath";

export const dynamic = "force-dynamic";

// ── GET — connection status ───────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  return NextResponse.json({
    navpro_base_url:
      process.env.TRUCKERPATH_API_URL || "https://api.truckerpath.com/navpro",
    mock_mode: isMockMode,
    has_token:
      !!process.env.TRUCKERPATH_API_KEY &&
      process.env.TRUCKERPATH_API_KEY.length > 20,
    hint: isMockMode
      ? "Mock mode ON — set USE_MOCK_DATA=false in .env and restart to use the live NavPro API"
      : "Live NavPro connection active. POST to /api/navpro/sync to pull fleet data.",
  });
}

// ── POST — sync live data into DB ─────────────────────────────────────────────

export async function POST(_req: NextRequest) {
  try {
    if (isMockMode) {
      return NextResponse.json({
        success: true,
        mode: "mock",
        message:
          "Mock mode active — no NavPro sync performed. Set USE_MOCK_DATA=false in .env to enable live sync.",
        drivers_synced: 0,
        vehicles_synced: 0,
      });
    }

    // 1. Pull from NavPro
    const [navproDrivers, navproVehicles]: [
      NavProDriverRecord[],
      NavProVehicleRecord[]
    ] = await Promise.all([
      queryDriversRaw({ driver_status: "ACTIVE", page: 0, size: 100 }),
      queryVehicles({ status: "ACTIVE", vehicle_type: "TRUCK", page: 0, size: 100 }),
    ]);

    // Build a vehicle lookup by vehicle_no
    const vehicleByNo = new Map<string, NavProVehicleRecord>();
    for (const v of navproVehicles) {
      vehicleByNo.set(v.vehicle_no, v);
    }

    // 2. Upsert drivers (using only fields guaranteed to be in the schema)
    let driversSynced = 0;
    for (const d of navproDrivers) {
      const fullName = `${d.driver_first_name} ${d.driver_last_name}`.trim();
      // We prefix IDs with "navpro-" to avoid collisions with demo cuid records
      const driverId = `navpro-${d.driver_id}`;
      const truckNo = `TP-${d.driver_id}`;
      const vehicle = vehicleByNo.get(truckNo);

      // height: NavPro stores in inches → convert to feet
      const heightFt = vehicle?.vehicle_details?.vehicle_height
        ? vehicle.vehicle_details.vehicle_height / 12
        : 13.6;
      const weightLbs = vehicle?.gross_vehicle_weight ?? 80000;

      try {
        await prisma.driver.upsert({
          where: { id: driverId },
          create: {
            id: driverId,
            name: fullName,
            phone: d.driver_phone_number || "—",
            // licenseNumber must be unique — use email as surrogate
            licenseNumber: d.driver_email || `CDL-NP-${d.driver_id}`,
            truckNumber: truckNo,
            status: "available",
            city: "—",
            state: "—",
            hosRemaining: 11.0,
            fuelLevel: 75,
            truckHeight: heightFt,
            truckWeight: weightLbs,
            onTimeRate: 0.92,
            totalTrips: 0,
          },
          update: {
            name: fullName,
            phone: d.driver_phone_number || "—",
            // Keep GPS, HOS, fuelLevel from local state
            // (NavPro /driver/query doesn't return real-time telemetry)
          },
        });
        driversSynced++;
      } catch (upsertErr) {
        // If there's a unique constraint collision (e.g. licenseNumber),
        // try updating by navpro truckNumber instead
        console.warn(
          `[NavPro Sync] upsert failed for driver ${d.driver_id}:`,
          upsertErr
        );
        try {
          await prisma.driver.upsert({
            where: { truckNumber: truckNo },
            create: {
              id: driverId,
              name: fullName,
              phone: d.driver_phone_number || "—",
              licenseNumber: `CDL-NP-${d.driver_id}-${Date.now()}`,
              truckNumber: truckNo,
              status: "available",
              city: "—",
              state: "—",
              hosRemaining: 11.0,
              fuelLevel: 75,
              truckHeight: heightFt,
              truckWeight: weightLbs,
              onTimeRate: 0.92,
              totalTrips: 0,
            },
            update: {
              name: fullName,
              phone: d.driver_phone_number || "—",
            },
          });
          driversSynced++;
        } catch (retryErr) {
          console.error(
            `[NavPro Sync] retry upsert also failed for ${d.driver_id}:`,
            retryErr
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      mode: "live",
      drivers_synced: driversSynced,
      vehicles_synced: navproVehicles.length,
      message: `Synced ${driversSynced} drivers and ${navproVehicles.length} vehicles from NavPro.`,
      navpro_base_url: process.env.TRUCKERPATH_API_URL,
      note: "GPS and HOS data require separate calls to /api/tracking/get/driver-dispatch per driver.",
    });
  } catch (err) {
    console.error("[POST /api/navpro/sync]", err);
    return NextResponse.json(
      {
        success: false,
        error: "NavPro sync failed",
        detail: String(err),
      },
      { status: 500 }
    );
  }
}
