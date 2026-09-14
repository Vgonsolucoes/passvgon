import { auth } from "@/auth";
import { NextResponse, type NextRequest } from "next/server";
import type { Session } from "next-auth";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/api/health",
  "/api/auth/",
  "/_next/static/",
  "/_next/image/",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml"
];

const API_PUBLIC_PREFIXES = ["/api/health", "/api/auth"];

type NextAuthRequest = NextRequest & { auth: Session | null };

export default auth((req) => {
  const r = req as NextAuthRequest;
  const { nextUrl } = r;
  const isLoggedIn = !!r.auth;
  const pathname = nextUrl.pathname;

  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isApiPublic = API_PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const isApiRoute = pathname.startsWith("/api/");

  if (isPublicPath || isApiPublic) {
    if (isLoggedIn && (pathname === "/login" || pathname === "/")) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    if (isApiRoute) {
      return NextResponse.json(
        { message: "Autenticação requerida" },
        { status: 401 }
      );
    }
    const callback = encodeURIComponent(pathname + nextUrl.search);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callback}`, nextUrl)
    );
  }

  const userRole = r.auth?.user.role;
  const isAdminRoute = pathname.startsWith("/dashboard");
  if (
    isAdminRoute &&
    userRole !== "ADMIN" &&
    userRole !== "USER" &&
    userRole !== "AUDITOR" &&
    userRole !== "OPERATOR"
  ) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"
  ]
};
