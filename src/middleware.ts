import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, parseSession } from "@/lib/demo-auth";

const adminApiRoutes = [
  "/api/alerts",
  "/api/assign",
  "/api/cost",
  "/api/drivers",
  "/api/loads",
  "/api/stats",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = parseSession(req.cookies.get(AUTH_COOKIE)?.value);

  if (adminApiRoutes.some((route) => pathname.startsWith(route))) {
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    if (session.kind !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }
  }

  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login/admin", req.url));
    }
    if (session.kind !== "admin") {
      return NextResponse.redirect(new URL("/driver", req.url));
    }
  }

  if (pathname.startsWith("/driver")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login/driver", req.url));
    }
    if (session.kind !== "driver") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/driver/:path*", "/api/:path*"],
};
