/**
 * Trucker Path NavPro API Client
 *
 * Real API base: https://api.truckerpath.com/navpro
 * Auth:          Bearer JWT (from TRUCKERPATH_API_KEY env var)
 * Docs:          https://docs.truckerpath.com/navpro.html
 * Collection:    api-1.json (OpenAPI 3.0.1)
 *
 * Falls back to rich mock data when USE_MOCK_DATA=true or the JWT is absent,
 * so the app runs fine for demos without a live connection.
 */

import axios, { AxiosInstance } from "axios";

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.TRUCKERPATH_API_URL || "https://api.truckerpath.com/navpro";

const JWT_TOKEN = process.env.TRUCKERPATH_API_KEY || "";

// Force mock mode by env flag OR if no token is present
const USE_MOCK =
  process.env.USE_MOCK_DATA === "true" || !JWT_TOKEN || JWT_TOKEN.length < 20;

const navpro: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${JWT_TOKEN}`,
  },
  timeout: 10_000,
});

function log(msg: string, data?: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[NavPro] ${msg}`, data ?? "");
  }
}

// ── Real API Types (matching OpenAPI collection) ──────────────────────────────

/** POST /api/driver/query — request body */
export interface DriverQueryRequest {
  driver_ids?: number[];
  driver_status?: "ACTIVE" | "INACTIVE" | "PENDING";
  page?: number;
  size?: number;
  driver_updated_after_time?: string; // "YYYY-MM-DD"
  driver_created_after_time?: string;
}

/** Single driver record returned by /api/driver/query */
export interface NavProDriverRecord {
  driver_id: number;
  driver_first_name: string;
  driver_last_name: string;
  driver_email: string;
  driver_phone_number: string;
  driver_type: string;           // e.g. "OWNER_OPERATOR_OO"
  driver_status: string;         // "ACTIVE" | "INACTIVE" | "PENDING"
  created_time?: string;
  updated_time?: string;
}

/** POST /api/vehicle/query — request body */
export interface VehicleQueryRequest {
  status?: "ACTIVE" | "INACTIVE";
  vehicle_type?: "TRUCK" | "TRAILER";
  page?: number;
  size?: number;
  search_name?: string;
  owner_list?: number[];
}

/** Single vehicle record returned by /api/vehicle/query */
export interface NavProVehicleRecord {
  vehicle_id: number;
  vehicle_no: string;
  vehicle_type: string;
  vehicle_status: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: string;
  fuel_type?: string;
  trailer_type?: string;
  axles?: string;
  gross_vehicle_weight?: number;
  vehicle_details?: {
    vehicle_height?: number;
    vehicle_width?: number;
    vehicle_length?: number;
    vehicle_odometer?: number;
    fuel_capacity?: number;
    sleeper_berth?: boolean;
  };
}

/** POST /api/vehicle/update/status — request body */
export interface VehicleStatusUpdateRequest {
  vehicle_id: number;
  vehicle_status: "ACTIVE" | "INACTIVE";
}

/** POST /api/trip/create — request body */
export interface TripCreateRequest {
  scheduled_start_time: string;  // ISO-8601 e.g. "2026-04-19T08:00:00Z"
  driver_id: number;
  routing_profile_id?: number;
  stop_points: TripStopPoint[];
}

export interface TripStopPoint {
  latitude: number;
  longitude: number;
  address_name: string;
  appointment_time?: string;     // ISO-8601
  dwell_time?: number;           // minutes
  notes?: string;
}

/** POST /api/tracking/get/driver-dispatch — request body */
export interface DriverTrackingRequest {
  driver_id: number;
  time_range: {
    start_time: string;  // ISO-8601
    end_time: string;
  };
  source?: "APP" | "ELD";
}

/** Single GPS tracking point */
export interface TrackingPoint {
  tracking_id?: number;
  driver_id?: number;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

/** POST /api/driver/invite — request body */
export interface DriverInviteRequest {
  driver_info: {
    driver_first_name: string;
    driver_last_name: string;
    driver_phone_number: string;
    driver_password: string;
    driver_email: string;
    driver_type:
      | "OWNER_OPERATOR_OO"
      | "COMPANY_DRIVER_CD"
      | "LEASE_OPERATOR_LO";
  }[];
}

// ── App-level normalized types (used across components) ───────────────────────

/** Normalized driver shape used by FleetIQ frontend/backend */
export interface NavProDriver {
  driver_id: string;
  name: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  hos_remaining: number;
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

// ── Utility ───────────────────────────────────────────────────────────────────

/** Haversine formula — straight-line distance in miles between two lat/lng */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── API Methods ───────────────────────────────────────────────────────────────

/**
 * POST /api/driver/query
 * Returns a list of drivers in your NavPro fleet.
 * Falls back to mock data on error or in mock mode.
 */
export async function queryDrivers(
  filters: DriverQueryRequest = {}
): Promise<NavProDriver[]> {
  if (USE_MOCK) {
    log("Mock mode — returning mock drivers");
    return getMockDrivers();
  }

  try {
    const body: DriverQueryRequest = {
      driver_status: "ACTIVE",
      page: 0,
      size: 50,
      ...filters,
    };
    log("POST /api/driver/query", body);
    const { data } = await navpro.post("/api/driver/query", body);

    // Real response shape: { code, message, data: { records: [...], total, ... } }
    const records: NavProDriverRecord[] =
      data?.data?.records ?? data?.records ?? data?.data ?? [];

    return records.map(normalizeDriver);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[NavPro] queryDrivers failed:", msg);
    return getMockDrivers();
  }
}

/**
 * POST /api/driver/query (raw)
 * Returns the raw NavPro driver records without normalization.
 * Useful for admin/debug views.
 */
export async function queryDriversRaw(
  filters: DriverQueryRequest = {}
): Promise<NavProDriverRecord[]> {
  if (USE_MOCK) {
    return [];
  }
  try {
    const { data } = await navpro.post("/api/driver/query", {
      driver_status: "ACTIVE",
      page: 0,
      size: 50,
      ...filters,
    });
    return data?.data?.records ?? data?.records ?? [];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[NavPro] queryDriversRaw failed:", msg);
    return [];
  }
}

/**
 * POST /api/vehicle/query
 * Returns all vehicles in the fleet.
 */
export async function queryVehicles(
  filters: VehicleQueryRequest = {}
): Promise<NavProVehicleRecord[]> {
  if (USE_MOCK) {
    log("Mock mode — returning mock vehicles");
    return getMockVehicles();
  }

  try {
    const body: VehicleQueryRequest = {
      status: "ACTIVE",
      vehicle_type: "TRUCK",
      page: 0,
      size: 50,
      ...filters,
    };
    log("POST /api/vehicle/query", body);
    const { data } = await navpro.post("/api/vehicle/query", body);
    return data?.data?.records ?? data?.records ?? [];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[NavPro] queryVehicles failed:", msg);
    return getMockVehicles();
  }
}

/**
 * POST /api/vehicle/update/status
 * Update a vehicle's status (ACTIVE / INACTIVE).
 * Used when dispatching a load — mark truck as assigned.
 */
export async function updateVehicleStatus(
  vehicleId: number,
  status: "ACTIVE" | "INACTIVE"
): Promise<{ success: boolean; message?: string }> {
  if (USE_MOCK) {
    log(`Mock mode — simulating status update for vehicle ${vehicleId}`);
    return { success: true, message: "Mock status updated" };
  }

  try {
    const body: VehicleStatusUpdateRequest = {
      vehicle_id: vehicleId,
      vehicle_status: status,
    };
    log("POST /api/vehicle/update/status", body);
    const { data } = await navpro.post("/api/vehicle/update/status", body);
    return { success: data?.code === 200 || data?.success === true, message: data?.message };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[NavPro] updateVehicleStatus failed:", msg);
    return { success: false, message: msg };
  }
}

/**
 * POST /api/trip/create
 * Create a new trip and assign it to a driver.
 * stop_points[0] = pickup, stop_points[1] = delivery.
 */
export async function createTrip(
  trip: TripCreateRequest
): Promise<{ success: boolean; trip_id?: number; message?: string }> {
  if (USE_MOCK) {
    const mockTripId = Math.floor(Math.random() * 90000) + 10000;
    log(`Mock mode — simulating trip creation, id=${mockTripId}`);
    return { success: true, trip_id: mockTripId };
  }

  try {
    log("POST /api/trip/create", trip);
    const { data } = await navpro.post("/api/trip/create", trip);
    // Real response: { code: 200, data: { trip_id: 12345 }, message: "OK" }
    const tripId: number | undefined = data?.data?.trip_id ?? data?.data?.id;
    return {
      success: data?.code === 200 || !!tripId,
      trip_id: tripId,
      message: data?.message,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[NavPro] createTrip failed:", msg);
    return { success: false, message: msg };
  }
}

/**
 * POST /api/tracking/get/driver-dispatch
 * Get GPS tracking points for a driver within a time window.
 */
export async function getDriverTracking(
  driverId: number,
  startTime: string,
  endTime: string,
  source: "APP" | "ELD" = "APP"
): Promise<TrackingPoint[]> {
  if (USE_MOCK) {
    log("Mock mode — returning mock tracking points");
    return getMockTrackingPoints(driverId);
  }

  try {
    const body: DriverTrackingRequest = {
      driver_id: driverId,
      time_range: { start_time: startTime, end_time: endTime },
      source,
    };
    log("POST /api/tracking/get/driver-dispatch", body);
    const { data } = await navpro.post(
      "/api/tracking/get/driver-dispatch",
      body
    );
    return data?.data?.records ?? data?.records ?? [];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[NavPro] getDriverTracking failed:", msg);
    return [];
  }
}

/**
 * POST /api/driver/invite
 * Invite a new driver to join the NavPro fleet.
 */
export async function inviteDriver(
  driverInfo: DriverInviteRequest["driver_info"][0]
): Promise<{ success: boolean; message?: string }> {
  if (USE_MOCK) {
    log("Mock mode — simulating driver invite");
    return { success: true, message: "Mock invite sent" };
  }

  try {
    const body: DriverInviteRequest = { driver_info: [driverInfo] };
    log("POST /api/driver/invite", body);
    const { data } = await navpro.post("/api/driver/invite", body);
    return { success: data?.code === 200, message: data?.message };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[NavPro] inviteDriver failed:", msg);
    return { success: false, message: msg };
  }
}

/**
 * GET /api/route/calculate (legacy helper — NavPro may not expose this directly)
 * For route calculation, we use Haversine + mock data.
 * Swap this out if NavPro adds a route endpoint in a future version.
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
  // Always use the computed mock for now (no route endpoint in current API version)
  return getMockRoute(params.origin_lat, params.dest_lat);
}

// ── Normalizer ────────────────────────────────────────────────────────────────

/**
 * Map a raw NavPro driver record to the normalized NavProDriver shape
 * used by FleetIQ components. Fills sensible defaults for fields the
 * NavPro API does not return (HOS, GPS — these come from ELD/app data).
 */
function normalizeDriver(r: NavProDriverRecord): NavProDriver {
  return {
    driver_id: String(r.driver_id),
    name: `${r.driver_first_name} ${r.driver_last_name}`.trim(),
    // NavPro /driver/query does not return GPS — use 0,0 as sentinel;
    // real GPS comes from /tracking/get/driver-dispatch
    latitude: 0,
    longitude: 0,
    city: "—",
    state: "—",
    // HOS not in driver/query — show full 11h as default until tracking enriches it
    hos_remaining: 11.0,
    status: r.driver_status === "ACTIVE" ? "available" : "off_duty",
    truck_number: `TP-${r.driver_id}`,
    fuel_level: 75,
  };
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

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

function getMockVehicles(): NavProVehicleRecord[] {
  return [
    {
      vehicle_id: 101,
      vehicle_no: "TP-101",
      vehicle_type: "TRUCK",
      vehicle_status: "ACTIVE",
      vehicle_make: "Freightliner",
      vehicle_model: "Cascadia",
      vehicle_year: "2022",
      gross_vehicle_weight: 80000,
      vehicle_details: { vehicle_height: 162, vehicle_width: 96, vehicle_length: 636, fuel_capacity: 300 },
    },
    {
      vehicle_id: 102,
      vehicle_no: "TP-102",
      vehicle_type: "TRUCK",
      vehicle_status: "ACTIVE",
      vehicle_make: "Kenworth",
      vehicle_model: "T680",
      vehicle_year: "2021",
      gross_vehicle_weight: 80000,
      vehicle_details: { vehicle_height: 163, vehicle_width: 96, vehicle_length: 630, fuel_capacity: 280 },
    },
    {
      vehicle_id: 103,
      vehicle_no: "TP-103",
      vehicle_type: "TRUCK",
      vehicle_status: "ACTIVE",
      vehicle_make: "Peterbilt",
      vehicle_model: "579",
      vehicle_year: "2023",
      gross_vehicle_weight: 80000,
      vehicle_details: { vehicle_height: 162, vehicle_width: 96, vehicle_length: 636, fuel_capacity: 300 },
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

function getMockTrackingPoints(driverId: number): TrackingPoint[] {
  const now = new Date();
  return Array.from({ length: 5 }, (_, i) => ({
    tracking_id: driverId * 1000 + i,
    driver_id: driverId,
    latitude: 33.4484 + i * 0.02,
    longitude: -112.074 + i * 0.03,
    speed: 62 - i * 2,
    heading: 90,
    timestamp: new Date(now.getTime() - i * 300_000).toISOString(),
  }));
}

// ── Export mock-mode flag for use in API routes ───────────────────────────────
export const isMockMode = USE_MOCK;
