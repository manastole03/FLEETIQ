import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const loads = await prisma.load.findMany({
      include: {
        assignments: {
          orderBy: { requestedAt: "desc" },
          take: 1,
          include: {
            driver: {
              select: { name: true, truckNumber: true },
            },
          },
        },
      },
      orderBy: { pickupDate: "asc" },
    });

    const normalizedLoads = loads.map((load) => ({
      ...load,
      assignment: load.assignments[0] ?? null,
    }));

    return NextResponse.json({ loads: normalizedLoads });
  } catch (err) {
    console.error("[GET /api/loads]", err);
    return NextResponse.json(
      { error: "Failed to fetch loads" },
      { status: 500 }
    );
  }
}
