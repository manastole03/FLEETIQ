import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const alerts = await prisma.alert.findMany({
      where: { resolved: false },
      include: {
        driver: { select: { name: true, truckNumber: true } },
        load: { select: { loadNumber: true } },
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ alerts });
  } catch (err) {
    console.error("[GET /api/alerts]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { alertId } = await req.json();
    await prisma.alert.update({
      where: { id: alertId },
      data: { resolved: true, resolvedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/alerts]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
