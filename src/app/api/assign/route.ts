import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { parseSession, AUTH_COOKIE } from "@/lib/demo-auth";
import { createAssignmentRequest, getAssignmentQueue } from "@/lib/assignment-service";

export const dynamic = "force-dynamic";

const AssignSchema = z.object({
  driverId: z.string(),
  loadId: z.string(),
  aiScore: z.number(),
  aiReasoning: z.string().optional(),
  fuelPrice: z.number().default(4.2),
  driverPayPerHour: z.number().default(28),
  reassignedFromId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queue = await getAssignmentQueue({
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      driverId: searchParams.get("driverId") ?? undefined,
    });

    return NextResponse.json(queue);
  } catch (err) {
    console.error("[GET /api/assign]", err);
    return NextResponse.json({ error: "Failed to load assignment queue" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = parseSession(cookieStore.get(AUTH_COOKIE)?.value);
    const body = await req.json();
    const parsed = AssignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      driverId,
      loadId,
      aiScore,
      aiReasoning,
      fuelPrice,
      driverPayPerHour,
      reassignedFromId,
    } = parsed.data;

    const result = await createAssignmentRequest({
      driverId,
      loadId,
      aiScore,
      aiReasoning,
      fuelPrice,
      driverPayPerHour,
      assignedBy: session?.userId,
      reassignedFromId,
    });

    return NextResponse.json({
      success: true,
      assignment: result.assignment,
      cost: result.cost,
      sms: result.smsResult,
    });
  } catch (err) {
    console.error("[POST /api/assign]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Assignment failed" },
      { status: 500 }
    );
  }
}
