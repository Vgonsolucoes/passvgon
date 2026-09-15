import { auth } from "@/auth";
import { NextResponse, type NextRequest } from "next/server";
import type { Session } from "next-auth";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/2fa",
  "/api/health",
  "/api/auth/",
  "/_next/static/",
  "/_next/image/",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml"
];

const API_PUBLIC_PREFIXES = ["/api/health", "/api/auth"];

const TWO_FACTOR_CHALLENGE = "/2fa";

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
      // Usuário já logado não precisa ficar em telas públicas
      const needsTwoFactor =
        r.auth?.user?.twoFactorRequired && !r.auth?.user?.twoFactorVerified;
      return NextResponse.redirect(
        new URL(needsTwoFactor ? TWO_FACTOR_CHALLENGE : "/dashboard", nextUrl)
      );
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

  // --- Bloqueio 2FA obrigatório (sessão PROVISÓRIA sem 2FA verified) ---
  const user = r.auth?.user;
  const needsTwoFactor =
    user?.twoFactorRequired && !user?.twoFactorVerified;
  if (needsTwoFactor) {
    // Página /2fa é a única privada que pode ser acessada
    if (pathname !== TWO_FACTOR_CHALLENGE) {
      if (isApiRoute) {
        return NextResponse.json(
          { message: "Segundo fator de autenticação pendente" },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL(TWO_FACTOR_CHALLENGE, nextUrl));
    }
  }

  const userRole = user?.role;
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
