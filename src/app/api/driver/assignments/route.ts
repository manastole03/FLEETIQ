import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, parseSession } from "@/lib/demo-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = parseSession(cookieStore.get(AUTH_COOKIE)?.value);
    if (!session || session.kind !== "driver") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const truckNumber = session.metadata.truckNumber;
    if (!truckNumber) {
      return NextResponse.json({
        pending: [],
        active: [],
        declined: [],
      });
    }

    const driver = await prisma.driver.findFirst({
      where: { truckNumber },
    });
    if (!driver) {
      return NextResponse.json({ pending: [], active: [], declined: [] });
    }

    const assignments = await prisma.assignment.findMany({
      where: { driverId: driver.id },
      include: {
        load: true,
      },
      orderBy: { requestedAt: "desc" },
    });

    const serialize = (statusList: string[]) =>
      assignments
        .filter((item) => statusList.includes(item.status))
        .map((item) => ({
          id: item.id,
          status: item.status,
          requestedAt: item.requestedAt,
          respondedAt: item.respondedAt,
          expiresAt: item.expiresAt,
          declineReason: item.declineReason,
          aiSummary: item.aiSummary,
          smsSent: item.smsSent,
          webNotificationSent: item.webNotificationSent,
          load: item.load,
        }));

    return NextResponse.json({
      pending: serialize(["PENDING"]),
      active: serialize(["ACCEPTED", "ASSIGNED", "IN_TRANSIT"]),
      declined: serialize(["DECLINED", "EXPIRED", "REASSIGNED"]),
    });
  } catch (err) {
    console.error("[GET /api/driver/assignments]", err);
    return NextResponse.json({ error: "Failed to fetch driver assignments" }, { status: 500 });
  }
}
