import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { AUTH_COOKIE, parseSession } from "@/lib/demo-auth";
import { prisma } from "@/lib/prisma";
import { markNotificationRead } from "@/lib/notification-service";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  notificationId: z.string(),
});

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = parseSession(cookieStore.get(AUTH_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    return NextResponse.json({ notifications });
  } catch (err) {
    console.error("[GET /api/notifications]", err);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = parseSession(cookieStore.get(AUTH_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await markNotificationRead(parsed.data.notificationId, session.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/notifications]", err);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
