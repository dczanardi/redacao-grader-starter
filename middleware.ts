// /middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // proteja só o que precisa
  const isProtected =
    pathname.startsWith("/tools/") || pathname.startsWith("/reports");

  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get("dcz_session")?.value;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/tools/:path*", "/reports/:path*"],
};