import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Public paths — no auth needed
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // If authenticated and hitting /login, redirect to dashboard
  if (pathname === "/login") {
    return token
      ? NextResponse.redirect(new URL("/dashboard", req.url))
      : NextResponse.next();
  }

  // Public landing page
  if (pathname === "/") {
    return NextResponse.next();
  }

  // All other paths require authentication
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Authenticated but must change password
  if (token.mustChangePassword && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", req.url));
  }

  // Admin-only routes
  if (pathname.startsWith("/users") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$).*)"],
};
