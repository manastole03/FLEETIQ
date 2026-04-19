import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      driverCounts,
      loadCounts,
      hosAlerts,
      recentAssignments,
    ] = await Promise.all([
      prisma.driver.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.load.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.alert.count({
        where: {
          type: { in: ["HOS_WARNING", "HOS_CRITICAL"] },
          resolved: false,
        },
      }),
      prisma.assignment.findMany({
        where: {
          assignedAt: { gte: new Date(Date.now() - 7 * 86400 * 1000) },
        },
        select: {
          estimatedRevenue: true,
          marginPercent: true,
          estimatedDeadMiles: true,
        },
      }),
    ]);

    const available =
      driverCounts.find((d) => d.status === "AVAILABLE")?._count.id ?? 0;
    const total = driverCounts.reduce((s, d) => s + d._count.id, 0);
    const pending =
      (loadCounts.find((l) => l.status === "PENDING")?._count.id ?? 0) +
      (loadCounts.find((l) => l.status === "PENDING_RESPONSE")?._count.id ?? 0) +
      (loadCounts.find((l) => l.status === "REASSIGNMENT_NEEDED")?._count.id ?? 0);
    const inTransit =
      (loadCounts.find((l) => l.status === "IN_TRANSIT")?._count.id ?? 0) +
      (loadCounts.find((l) => l.status === "ASSIGNED")?._count.id ?? 0) +
      (loadCounts.find((l) => l.status === "ACCEPTED")?._count.id ?? 0);

    const weeklyRevenue = recentAssignments.reduce(
      (s, a) => s + a.estimatedRevenue,
      0
    );
    const avgMargin =
      recentAssignments.length > 0
        ? recentAssignments.reduce((s, a) => s + a.marginPercent, 0) /
          recentAssignments.length
        : 0;
    const avgDeadMiles =
      recentAssignments.length > 0
        ? recentAssignments.reduce((s, a) => s + a.estimatedDeadMiles, 0) /
          recentAssignments.length
        : 0;

    return NextResponse.json({
      availableDrivers: available,
      totalDrivers: total,
      pendingLoads: pending,
      activeTrips: inTransit,
      hosAlerts,
      weeklyRevenue: Math.round(weeklyRevenue),
      avgMarginPercent: Math.round(avgMargin * 10) / 10,
      avgDeadMiles: Math.round(avgDeadMiles),
    });
  } catch (err) {
    console.error("[GET /api/stats]", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
