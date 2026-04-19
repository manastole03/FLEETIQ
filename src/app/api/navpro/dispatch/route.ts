/**
 * POST /api/navpro/dispatch
 *
 * Creates a real NavPro trip via POST /api/trip/create and updates the
 * vehicle status via POST /api/vehicle/update/status.
 *
 * Request body:
 *   {
 *     driverId:        string,   // FleetIQ driver id (e.g. "navpro-12345")
 *     navproDriverId:  number,   // actual NavPro numeric driver_id
 *     vehicleId:       number,   // NavPro vehicle_id
 *     originAddress:   string,
 *     originLat:       number,
 *     originLng:       number,
 *     destAddress:     string,
 *     destLat:         number,
 *     destLng:         number,
 *     pickupTime:      string,   // ISO-8601
 *     deliveryTime:    string,   // ISO-8601
 *     loadId:          string,
 *   }
 *
 * Response:
 *   { success, trip_id, message }
 */

import { NextRequest, NextResponse } from "next/server";
import { createTrip, updateVehicleStatus, isMockMode } from "@/lib/truckerpath";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      navproDriverId,
      vehicleId,
      originAddress,
      originLat,
      originLng,
      destAddress,
      destLat,
      destLng,
      pickupTime,
      deliveryTime,
      loadId,
      driverId,
    } = body;

    if (!navproDriverId || !originLat || !destLat) {
      return NextResponse.json(
        { error: "Missing required fields: navproDriverId, originLat, destLat" },
        { status: 400 }
      );
    }

    // 1. Create trip on NavPro
    const tripResult = await createTrip({
      scheduled_start_time: pickupTime || new Date().toISOString(),
      driver_id: Number(navproDriverId),
      stop_points: [
        {
          latitude: originLat,
          longitude: originLng,
          address_name: originAddress || "Pickup",
          appointment_time: pickupTime,
          dwell_time: 30,
          notes: `Load ${loadId} pickup`,
        },
        {
          latitude: destLat,
          longitude: destLng,
          address_name: destAddress || "Delivery",
          appointment_time: deliveryTime,
          dwell_time: 0,
          notes: `Load ${loadId} delivery`,
        },
      ],
    });

    // 2. Update vehicle status to INACTIVE (in-use)
    if (vehicleId && !isMockMode) {
      await updateVehicleStatus(Number(vehicleId), "INACTIVE");
    }

    // 3. Update local DB driver status
    if (driverId) {
      await prisma.driver.update({
        where: { id: driverId },
        data: { status: "on_trip" },
      }).catch(() => {/* driver may not exist in local DB */});
    }

    return NextResponse.json({
      success: tripResult.success,
      trip_id: tripResult.trip_id,
      mock_mode: isMockMode,
      message: tripResult.success
        ? `Trip created successfully. NavPro trip ID: ${tripResult.trip_id}`
        : `NavPro trip creation failed: ${tripResult.message}`,
    });
  } catch (err) {
    console.error("[POST /api/navpro/dispatch]", err);
    return NextResponse.json(
      { success: false, error: "Dispatch failed", detail: String(err) },
      { status: 500 }
    );
  }
}
