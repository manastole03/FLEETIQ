/**
 * Trucker Path NavPro API Client
 * Docs: https://docs.truckerpath.com/navpro.html
 *
 * Falls back to mock data when TRUCKERPATH_API_KEY is not set -
 * safe for hackathon demos and local development.
 */

import axios, { AxiosInstance } from "axios";

const BASE_URL =
  process.env.TRUCKERPATH_API_URL || "https://navpro.truckerpath.com";
const API_KEY = process.env.TRUCKERPATH_API_KEY || "";

const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_KEY}`,
  },
  timeout: 8000,
});

// ── Types ──────────────────────────────────────────────────────────────────

export interface NavProDriver {
  driver_id: string;
  name: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  hos_remaining: number; // hours
  status: "available" | "on_trip" | "resting" | "off_duty";
  truck_number: string;
  fuel_level: number;
}

export interface NavProRoute {
  distance_miles: number;
  estimated_hours: number;
  fuel_stops: FuelStop[];
  toll_estimate: number;
  has_low_bridge: boolean;
  has_weigh_station: boolean;
  polyline: string;
}

export interface FuelStop {
  name: string;
  city: string;
  price_per_gallon: number;
  latitude: number;
  longitude: number;
  mile_marker: number;
}

export interface NavProVehicleUpdate {
  truck_number: string;
  driver_id: string;
  load_id: string;
  status: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const isMockMode = !API_KEY || API_KEY === "your-navpro-api-key";

function log(msg: string) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[NavPro] ${msg}`);
  }
}

// ── API Methods ────────────────────────────────────────────────────────────

/**
 * POST /api/driver/query
 * Fetch available drivers with current GPS + HOS status
 */
export async function queryDrivers(filters?: {
  status?: string;
  state?: string;
}): Promise<NavProDriver[]> {
  if (isMockMode) {
    log("Mock mode - returning mock drivers");
    return getMockDrivers();
  }

  try {
    const { data } = await client.post("/api/driver/query", {
      status: filters?.status || "available",
      state: filters?.state,
    });
    return data.drivers;
  } catch (err) {
    console.error("[NavPro] queryDrivers failed:", err);
    return getMockDrivers();
  }
}

/**
 * GET /api/route/calculate
 * Calculate truck-safe route between two lat/lng points
 */
export async function calculateRoute(params: {
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
  truck_height?: number;
  truck_weight?: number;
  has_hazmat?: boolean;
}): Promise<NavProRoute> {
  if (isMockMode) {
    log("Mock mode - returning mock route");
    return getMockRoute(params.origin_lat, params.dest_lat);
  }

  try {
    const { data } = await client.get("/api/route/calculate", {
      params: {
        origin_lat: params.origin_lat,
        origin_lng: params.origin_lng,
        dest_lat: params.dest_lat,
        dest_lng: params.dest_lng,
        truck_height: params.truck_height || 13.6,
        truck_weight: params.truck_weight || 80000,
        hazmat: params.has_hazmat || false,
      },
    });
    return data.route;
  } catch (err) {
    console.error("[NavPro] calculateRoute failed:", err);
    return getMockRoute(params.origin_lat, params.dest_lat);
  }
}

/**
 * POST /api/vehicle/update/status
 * Assign a load to a driver (triggers check-call in NavPro)
 */
export async function updateVehicleStatus(
  update: NavProVehicleUpdate
): Promise<{ success: boolean; check_call_id: string }> {
  if (isMockMode) {
    log(`Mock mode - simulating assignment for truck ${update.truck_number}`);
    return {
      success: true,
      check_call_id: `CC-${Date.now()}`,
    };
  }

  try {
    const { data } = await client.post("/api/vehicle/update/status", update);
    return data;
  } catch (err) {
    console.error("[NavPro] updateVehicleStatus failed:", err);
    return { success: false, check_call_id: "" };
  }
}

/**
 * Haversine formula - straight-line distance between two lat/lng points
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Mock Data ──────────────────────────────────────────────────────────────

function getMockDrivers(): NavProDriver[] {
  return [
    {
      driver_id: "drv-001",
      name: "Carlos Mendez",
      latitude: 33.4484,
      longitude: -112.074,
      city: "Phoenix",
      state: "AZ",
      hos_remaining: 10.5,
      status: "available",
      truck_number: "TP-101",
      fuel_level: 78,
    },
    {
      driver_id: "drv-002",
      name: "Devon Riley",
      latitude: 33.4152,
      longitude: -111.831,
      city: "Mesa",
      state: "AZ",
      hos_remaining: 8.0,
      status: "available",
      truck_number: "TP-102",
      fuel_level: 55,
    },
    {
      driver_id: "drv-003",
      name: "Raj Patel",
      latitude: 32.2226,
      longitude: -110.9747,
      city: "Tucson",
      state: "AZ",
      hos_remaining: 11.0,
      status: "available",
      truck_number: "TP-103",
      fuel_level: 90,
    },
    {
      driver_id: "drv-004",
      name: "Maria Torres",
      latitude: 33.4255,
      longitude: -111.94,
      city: "Tempe",
      state: "AZ",
      hos_remaining: 3.5,
      status: "available",
      truck_number: "TP-104",
      fuel_level: 40,
    },
    {
      driver_id: "drv-005",
      name: "Luis Gonzalez",
      latitude: 35.1983,
      longitude: -111.6513,
      city: "Flagstaff",
      state: "AZ",
      hos_remaining: 9.0,
      status: "available",
      truck_number: "TP-105",
      fuel_level: 65,
    },
    {
      driver_id: "drv-006",
      name: "Tanya Williams",
      latitude: 33.4942,
      longitude: -111.9261,
      city: "Scottsdale",
      state: "AZ",
      hos_remaining: 2.0,
      status: "resting",
      truck_number: "TP-106",
      fuel_level: 72,
    },
  ];
}

function getMockRoute(originLat: number, destLat: number): NavProRoute {
  const dist = Math.abs(destLat - originLat) * 110 + 200;
  return {
    distance_miles: Math.round(dist),
    estimated_hours: Math.round((dist / 55) * 10) / 10,
    fuel_stops: [
      {
        name: "Pilot Flying J",
        city: "Lordsburg",
        price_per_gallon: 4.12,
        latitude: 32.3479,
        longitude: -108.7062,
        mile_marker: 220,
      },
      {
        name: "Love's Travel Stop",
        city: "Las Cruces",
        price_per_gallon: 4.28,
        latitude: 32.3199,
        longitude: -106.7637,
        mile_marker: 490,
      },
    ],
    toll_estimate: Math.round(dist * 0.06),
    has_low_bridge: false,
    has_weigh_station: true,
    polyline: "",
  };
}
