export type {
  Driver,
  Load,
  Assignment,
  Alert,
  Notification,
  SmsLog,
  DriverResponse,
} from "@prisma/client";

export interface DriverWithScore {
  id: string;
  name: string;
  city: string;
  state: string;
  hosRemaining: number;
  status: string;
  truckNumber: string;
  fuelLevel: number | null;
  onTimeRate: number;
  totalTrips: number;
  deadMiles: number;
  aiScore: number;
  hosScore: number;
  deadMileScore: number;
  onTimeScore: number;
  complianceScore: number;
  complianceStatus: "ok" | "warn" | "critical";
  complianceReason: string | null;
  reasoning: string;
  recommendation: "assign" | "marginal" | "skip";
  eligibleForDispatch?: boolean;
  dispatchBlockReasons?: string[];
  requiredHosHours?: number;
  recommendationRank?: number;
}

export interface LoadWithAssignment {
  id: string;
  loadNumber: string;
  status: string;
  originCity: string;
  originState: string;
  destCity: string;
  destState: string;
  rate: number;
  estimatedMiles: number;
  shipper: string;
  commodity: string;
  pickupDate: string;
  deliveryDate: string;
  assignment: {
    id: string;
    driverId: string;
    driver: { name: string; truckNumber: string };
    estimatedNetMargin: number;
    marginPercent: number;
    status: string;
  } | null;
}

export interface CostBreakdown {
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

export interface FleetStats {
  availableDrivers: number;
  totalDrivers: number;
  pendingLoads: number;
  activeTrips: number;
  avgDeadMiles: number;
  hosAlerts: number;
  weeklyRevenue: number;
  avgMarginPercent: number;
}
