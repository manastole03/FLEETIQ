export const AUTH_COOKIE = "fleetiq_session";

export type UserKind = "admin" | "driver";

export type AdminRole =
  | "Fleet Owner"
  | "Dispatcher"
  | "Safety Manager"
  | "Operations Manager";

export type DriverRole = "Driver";

export interface DemoUser {
  id: string;
  kind: UserKind;
  name: string;
  email: string;
  username: string;
  password: string;
  role: AdminRole | DriverRole;
  title: string;
  metadata: {
    fleet?: string;
    permissions?: string[];
    driverCode?: string;
    truckNumber?: string;
    homeTerminal?: string;
    hosRemaining?: number;
    fuelLevel?: number;
    completedTrips?: number;
    weeklyEarnings?: number;
  };
}

export interface DemoSession {
  userId: string;
  kind: UserKind;
  name: string;
  email: string;
  username: string;
  role: string;
  title: string;
  metadata: DemoUser["metadata"];
  issuedAt: number;
}

export const adminUsers: DemoUser[] = [
  {
    id: "admin-owner",
    kind: "admin",
    name: "Elena Brooks",
    email: "owner@fleetiq.demo",
    username: "fleet-owner",
    password: "navpro-demo",
    role: "Fleet Owner",
    title: "Fleet Owner",
    metadata: {
      fleet: "DesertLine Logistics",
      permissions: ["fleet_overview", "billing", "dispatch", "compliance"],
    },
  },
  {
    id: "admin-dispatcher",
    kind: "admin",
    name: "Maria Santos",
    email: "dispatcher@fleetiq.demo",
    username: "dispatcher",
    password: "navpro-demo",
    role: "Dispatcher",
    title: "Lead Dispatcher",
    metadata: {
      fleet: "DesertLine Logistics",
      permissions: ["dispatch", "driver_visibility", "load_assignment"],
    },
  },
  {
    id: "admin-safety",
    kind: "admin",
    name: "Priya Mehta",
    email: "safety@fleetiq.demo",
    username: "safety-manager",
    password: "navpro-demo",
    role: "Safety Manager",
    title: "Safety Manager",
    metadata: {
      fleet: "DesertLine Logistics",
      permissions: ["compliance", "hos", "route_risk"],
    },
  },
  {
    id: "admin-ops",
    kind: "admin",
    name: "Marcus Reed",
    email: "ops@fleetiq.demo",
    username: "operations",
    password: "navpro-demo",
    role: "Operations Manager",
    title: "Operations Manager",
    metadata: {
      fleet: "DesertLine Logistics",
      permissions: ["analytics", "dispatch", "documents"],
    },
  },
];

export const driverUsers: DemoUser[] = [
  {
    id: "driver-carlos",
    kind: "driver",
    name: "Carlos Mendez",
    email: "carlos@fleetiq.demo",
    username: "driver-carlos",
    password: "driver-demo",
    role: "Driver",
    title: "Company Driver",
    metadata: {
      driverCode: "D-104",
      truckNumber: "TP-101",
      homeTerminal: "Phoenix, AZ",
      hosRemaining: 8.5,
      fuelLevel: 72,
      completedTrips: 18,
      weeklyEarnings: 1840,
    },
  },
  {
    id: "driver-devon",
    kind: "driver",
    name: "Devon Riley",
    email: "devon@fleetiq.demo",
    username: "driver-devon",
    password: "driver-demo",
    role: "Driver",
    title: "Regional Driver",
    metadata: {
      driverCode: "D-117",
      truckNumber: "TP-102",
      homeTerminal: "Mesa, AZ",
      hosRemaining: 6.75,
      fuelLevel: 64,
      completedTrips: 23,
      weeklyEarnings: 2110,
    },
  },
  {
    id: "driver-raj",
    kind: "driver",
    name: "Raj Patel",
    email: "raj@fleetiq.demo",
    username: "driver-raj",
    password: "driver-demo",
    role: "Driver",
    title: "OTR Driver",
    metadata: {
      driverCode: "D-121",
      truckNumber: "TP-103",
      homeTerminal: "Tucson, AZ",
      hosRemaining: 9.25,
      fuelLevel: 81,
      completedTrips: 16,
      weeklyEarnings: 1965,
    },
  },
  {
    id: "driver-maria",
    kind: "driver",
    name: "Maria Torres",
    email: "maria@fleetiq.demo",
    username: "driver-maria",
    password: "driver-demo",
    role: "Driver",
    title: "Dedicated Driver",
    metadata: {
      driverCode: "D-133",
      truckNumber: "TP-104",
      homeTerminal: "Tempe, AZ",
      hosRemaining: 7.4,
      fuelLevel: 58,
      completedTrips: 21,
      weeklyEarnings: 2045,
    },
  },
  {
    id: "driver-luis",
    kind: "driver",
    name: "Luis Gonzalez",
    email: "luis@fleetiq.demo",
    username: "driver-luis",
    password: "driver-demo",
    role: "Driver",
    title: "Fleet Driver",
    metadata: {
      driverCode: "D-149",
      truckNumber: "TP-105",
      homeTerminal: "Phoenix, AZ",
      hosRemaining: 5.9,
      fuelLevel: 69,
      completedTrips: 14,
      weeklyEarnings: 1720,
    },
  },
];

export const demoUsers = [...adminUsers, ...driverUsers];

export function findDemoUser(identifier: string, password: string, kind: UserKind) {
  const normalized = identifier.trim().toLowerCase();
  return demoUsers.find(
    (user) =>
      user.kind === kind &&
      user.password === password &&
      (user.email.toLowerCase() === normalized ||
        user.username.toLowerCase() === normalized)
  );
}

export function createSession(user: DemoUser): DemoSession {
  return {
    userId: user.id,
    kind: user.kind,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    title: user.title,
    metadata: user.metadata,
    issuedAt: Date.now(),
  };
}

export function encodeSession(session: DemoSession) {
  return encodeURIComponent(JSON.stringify(session));
}

export function parseSession(value?: string | null): DemoSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as DemoSession;
    if (!parsed.userId || !parsed.kind) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getDefaultPath(kind: UserKind) {
  return kind === "admin" ? "/dashboard" : "/driver";
}

export function findDriverSessionUserIdByTruckNumber(truckNumber?: string | null) {
  if (!truckNumber) return null;
  const normalized = truckNumber.trim().toLowerCase();
  const match = driverUsers.find(
    (user) => user.metadata.truckNumber?.trim().toLowerCase() === normalized
  );
  return match?.id ?? null;
}
