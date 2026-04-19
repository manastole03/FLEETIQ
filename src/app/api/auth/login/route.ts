import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  AUTH_COOKIE,
  createSession,
  encodeSession,
  findDemoUser,
  getDefaultPath,
} from "@/lib/demo-auth";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
  kind: z.enum(["admin", "driver"]),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = LoginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid login request" },
      { status: 400 }
    );
  }

  const user = findDemoUser(
    parsed.data.identifier,
    parsed.data.password,
    parsed.data.kind
  );

  if (!user) {
    return NextResponse.json(
      { error: "Invalid demo credentials for selected login type" },
      { status: 401 }
    );
  }

  const session = createSession(user);
  const res = NextResponse.json({
    success: true,
    session,
    redirectTo: getDefaultPath(user.kind),
  });

  res.cookies.set(AUTH_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return res;
}
