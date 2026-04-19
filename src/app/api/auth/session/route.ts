import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, parseSession } from "@/lib/demo-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const session = parseSession(cookieStore.get(AUTH_COOKIE)?.value);
  return NextResponse.json({ session });
}
