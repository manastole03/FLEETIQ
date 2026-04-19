import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { AUTH_COOKIE, parseSession, findDriverSessionUserIdByTruckNumber } from "@/lib/demo-auth";
import { prisma } from "@/lib/prisma";
import { respondToAssignment } from "@/lib/assignment-service";

export const dynamic = "force-dynamic";

const RespondSchema = z.object({
  assignmentId: z.string(),
  response: z.enum(["ACCEPTED", "DECLINED"]),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = parseSession(cookieStore.get(AUTH_COOKIE)?.value);
    if (!session || session.kind !== "driver") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = RespondSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: parsed.data.assignmentId },
      include: { driver: true },
    });
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const sessionUserId = findDriverSessionUserIdByTruckNumber(assignment.driver.truckNumber);
    if (sessionUserId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await respondToAssignment({
      assignmentId: parsed.data.assignmentId,
      driverId: assignment.driverId,
      response: parsed.data.response,
      reason: parsed.data.reason,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/assign/respond]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to respond" },
      { status: 500 }
    );
  }
}
