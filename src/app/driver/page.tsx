import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import DriverDashboardClient from "./DriverDashboardClient";
import { LogoutButton } from "@/components/LogoutButton";
import { DriverAssignmentCenter } from "@/components/DriverAssignmentCenter";
import { AUTH_COOKIE, parseSession } from "@/lib/demo-auth";
import { Activity, Fuel, Gauge, MapPinned, ShieldCheck, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DriverPage() {
  const cookieStore = await cookies();
  const currentUser = parseSession(cookieStore.get(AUTH_COOKIE)?.value);
  const sessionTruck = currentUser?.metadata.truckNumber;

  const driverWithTrip = await prisma.assignment.findFirst({
    where: {
      status: { in: ["ACCEPTED", "ASSIGNED", "IN_TRANSIT"] },
      ...(sessionTruck
        ? { driver: { is: { truckNumber: sessionTruck } } }
        : {}),
    },
    include: {
      driver: true,
      load: true,
    },
    orderBy: { assignedAt: "desc" },
  });

  const activeTrip = driverWithTrip
    ? {
        assignmentId: driverWithTrip.id,
        assignmentStatus: driverWithTrip.status,
        loadNumber: driverWithTrip.load.loadNumber,
        originCity: driverWithTrip.load.originCity,
        originState: driverWithTrip.load.originState,
        destCity: driverWithTrip.load.destCity,
        destState: driverWithTrip.load.destState,
        commodity: driverWithTrip.load.commodity,
        estimatedMiles: driverWithTrip.load.estimatedMiles,
        pickupDate: driverWithTrip.load.pickupDate.toISOString(),
        deliveryDate: driverWithTrip.load.deliveryDate.toISOString(),
        rate: driverWithTrip.load.rate,
      }
    : buildDemoTrip(currentUser?.userId);

  const driverInfo = {
    name: currentUser?.name ?? driverWithTrip?.driver.name ?? "John Miller",
    title: currentUser?.title ?? "Company Driver",
    driverCode: currentUser?.metadata.driverCode ?? "D-104",
    truckNumber:
      currentUser?.metadata.truckNumber ??
      driverWithTrip?.driver.truckNumber ??
      "TP-201",
    homeTerminal: currentUser?.metadata.homeTerminal ?? "Phoenix, AZ",
    hosRemaining:
      currentUser?.metadata.hosRemaining ??
      driverWithTrip?.driver.hosRemaining ??
      8.5,
    fuelLevel:
      currentUser?.metadata.fuelLevel ?? driverWithTrip?.driver.fuelLevel ?? 72,
    completedTrips: currentUser?.metadata.completedTrips ?? 18,
    weeklyEarnings: currentUser?.metadata.weeklyEarnings ?? 1840,
  };

  return (
    <main className="app-bg min-h-screen text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070908]/88 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-lg border border-white/10 bg-[#111a16] px-3 py-2 text-sm font-black text-white hover:border-[#26d69b]/45"
          >
            <Truck className="h-4 w-4 text-[#26d69b]" />
            FleetIQ Driver
          </Link>
          <div className="flex items-center gap-3">
            <LogoutButton
              redirectTo="/login/driver"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#111a16] px-3 py-2 text-sm font-black text-white hover:border-[#ff5d6c]/45"
            />
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f9f6e] text-white">
              <Truck className="h-5 w-5" />
            </span>
            <div className="text-right">
              <p className="text-sm font-bold">{driverInfo.name}</p>
              <p className="text-xs text-[#8ea198]">
                {driverInfo.truckNumber} - HOS {driverInfo.hosRemaining}h
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6 overflow-hidden rounded-lg border border-white/10 bg-[#0b110f] shell-shadow">
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:p-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-[#26d69b]/30 bg-[#102019] px-2.5 py-1 text-xs font-black text-[#55f0b1]">
                  Driver workspace
                </span>
                <span className="rounded-md border border-white/10 bg-[#111a16] px-2.5 py-1 text-xs font-black text-[#8ea198]">
                  {driverInfo.driverCode}
                </span>
              </div>
              <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
                Good to go, {driverInfo.name.split(" ")[0]}.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8ea198]">
                Current trip, truck-safe route, HOS, recommended stops, and
                document closeout are synced with dispatch.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DriverStat icon={Truck} label="Truck" value={driverInfo.truckNumber} sub={driverInfo.title} />
              <DriverStat icon={Gauge} label="HOS remaining" value={`${driverInfo.hosRemaining}h`} sub="legal drive window" />
              <DriverStat icon={Fuel} label="Fuel level" value={`${Math.round(driverInfo.fuelLevel ?? 0)}%`} sub="next stop modeled" />
              <DriverStat icon={Activity} label="Weekly summary" value={`$${driverInfo.weeklyEarnings.toLocaleString()}`} sub={`${driverInfo.completedTrips} completed trips`} />
            </div>
          </div>

          <div className="grid border-t border-white/10 bg-[#070908]/70 px-5 py-3 text-xs font-bold text-[#8ea198] sm:grid-cols-3 lg:px-6">
            <div className="flex items-center gap-2">
              <MapPinned className="h-4 w-4 text-[#26d69b]" />
              Home terminal: {driverInfo.homeTerminal}
            </div>
            <div className="mt-2 flex items-center gap-2 sm:mt-0">
              <ShieldCheck className="h-4 w-4 text-[#26d69b]" />
              Protected driver route
            </div>
            <div className="mt-2 flex items-center gap-2 sm:mt-0">
              <Activity className="h-4 w-4 text-[#26d69b]" />
              Live NavPro demo data
            </div>
          </div>
        </div>

        <DriverAssignmentCenter />
        <DriverDashboardClient activeTrip={activeTrip} driverInfo={driverInfo} />
      </section>
    </main>
  );
}

function DriverStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Truck;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#111a16] p-4">
      <Icon className="h-5 w-5 text-[#26d69b]" />
      <p className="mt-3 text-xs font-black uppercase text-[#8ea198]">{label}</p>
      <p className="mono mt-1 text-xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[#8ea198]">{sub}</p>
    </div>
  );
}

function buildDemoTrip(userId?: string) {
  const demoTrips: Record<
    string,
    {
      loadNumber: string;
      originCity: string;
      originState: string;
      destCity: string;
      destState: string;
      commodity: string;
      estimatedMiles: number;
      rate: number;
    }
  > = {
    "driver-carlos": {
      loadNumber: "LOAD-D104",
      originCity: "Phoenix",
      originState: "AZ",
      destCity: "Dallas",
      destState: "TX",
      commodity: "Retail Merchandise",
      estimatedMiles: 1072,
      rate: 2400,
    },
    "driver-devon": {
      loadNumber: "LOAD-D117",
      originCity: "Tucson",
      originState: "AZ",
      destCity: "Los Angeles",
      destState: "CA",
      commodity: "Building Materials",
      estimatedMiles: 487,
      rate: 1850,
    },
    "driver-raj": {
      loadNumber: "LOAD-D121",
      originCity: "Flagstaff",
      originState: "AZ",
      destCity: "Denver",
      destState: "CO",
      commodity: "E-commerce Parcels",
      estimatedMiles: 669,
      rate: 3100,
    },
    "driver-maria": {
      loadNumber: "LOAD-D133",
      originCity: "Phoenix",
      originState: "AZ",
      destCity: "Albuquerque",
      destState: "NM",
      commodity: "Medical Supplies",
      estimatedMiles: 421,
      rate: 2250,
    },
    "driver-luis": {
      loadNumber: "LOAD-D149",
      originCity: "Mesa",
      originState: "AZ",
      destCity: "Las Vegas",
      destState: "NV",
      commodity: "Refrigerated Produce",
      estimatedMiles: 304,
      rate: 1700,
    },
  };

  const trip = demoTrips[userId ?? "driver-carlos"] ?? demoTrips["driver-carlos"];
  return {
    assignmentId: `demo-${userId ?? "driver-carlos"}`,
    assignmentStatus: "ASSIGNED",
    ...trip,
    pickupDate: new Date(Date.now() + 3 * 3600000).toISOString(),
    deliveryDate: new Date(Date.now() + 20 * 3600000).toISOString(),
  };
}
