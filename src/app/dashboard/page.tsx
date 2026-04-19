import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/Dashboard";
import { cookies } from "next/headers";
import { AUTH_COOKIE, parseSession } from "@/lib/demo-auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const currentUser = parseSession(cookieStore.get(AUTH_COOKIE)?.value);

  const [loads, drivers, alerts] = await Promise.all([
    prisma.load.findMany({
      include: {
        assignments: {
          orderBy: { requestedAt: "desc" },
          take: 1,
          include: {
            driver: { select: { name: true, truckNumber: true } },
          },
        },
      },
      orderBy: { pickupDate: "asc" },
    }),
    prisma.driver.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.alert.findMany({
      where: { resolved: false },
      include: {
        driver: { select: { name: true, truckNumber: true } },
        load:   { select: { loadNumber: true } },
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const normalizedLoads = loads.map((load) => ({
    ...load,
    assignment: load.assignments[0] ?? null,
  }));

  const stats = {
    availableDrivers: drivers.filter((d) => d.status === "AVAILABLE").length,
    totalDrivers: drivers.length,
    pendingLoads: loads.filter((l) => ["PENDING", "PENDING_RESPONSE", "REASSIGNMENT_NEEDED"].includes(l.status)).length,
    activeTrips: loads.filter((l) => ["ASSIGNED", "IN_TRANSIT"].includes(l.status)).length,
    hosAlerts: alerts.filter(
      (a) => a.type === "HOS_WARNING" || a.type === "HOS_CRITICAL"
    ).length,
  };

  return (
    <DashboardClient
      initialLoads={JSON.parse(JSON.stringify(normalizedLoads))}
      initialDrivers={JSON.parse(JSON.stringify(drivers))}
      initialAlerts={JSON.parse(JSON.stringify(alerts))}
      initialStats={stats}
      currentUser={currentUser}
    />
  );
}
