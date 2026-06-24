import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromToken } from "@/lib/auth/session";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = req.cookies.get("admin_session")?.value;
  const valid = token ? await verifySessionFromToken(token) : false;

  if (!valid) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("redirected", "1");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
