import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  if (req.auth) return;

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const signInUrl = new URL("/signin", req.nextUrl.origin);
  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: [
    "/apps/:path*",
    "/expenses/:path*",
    "/reminders/:path*",
    "/stocks/:path*",
    "/api/expenses/:path*",
    "/api/categories/:path*",
    "/api/trends/:path*",
    "/api/reminders/:path*",
    "/api/reminder-categories/:path*",
    "/api/stocks/:path*",
  ],
};
