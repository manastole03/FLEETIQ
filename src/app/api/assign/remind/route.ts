import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendPendingReminder } from "@/lib/assignment-service";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  assignmentId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const result = await sendPendingReminder(parsed.data.assignmentId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/assign/remind]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send reminder" },
      { status: 500 }
    );
  }
}
