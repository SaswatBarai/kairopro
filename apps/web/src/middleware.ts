import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedRoutes = ["/dashboard", "/projects", "/settings"];
const authRoutes = ["/login", "/register"];
const protectedApiRoutes = [
  "/api/projects",
  "/api/specs",
  "/api/builds",
  "/api/credentials",
  "/api/inputs",
  "/api/versions",
];

export async function middleware(req: NextRequest) {
  const secret =
    process.env.NEXTAUTH_SECRET ??
    "kairopro-default-dev-secret-do-not-use-in-prod";
  const token = await getToken({ req, secret });
  const isAuthenticated = Boolean(token?.id);
  const { pathname } = req.nextUrl;

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isProtectedApiRoute = protectedApiRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // If user is authenticated and trying to access /login or /register, redirect to /dashboard
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // If user is NOT authenticated and trying to access protected pages, redirect to /login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set(
      "callbackUrl",
      req.nextUrl.pathname + req.nextUrl.search,
    );
    return NextResponse.redirect(loginUrl);
  }

  // If user is NOT authenticated and trying to access protected API routes, return 401 JSON
  if (isProtectedApiRoute && !isAuthenticated) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/projects",
    "/projects/:path*",
    "/settings",
    "/settings/:path*",
    "/login",
    "/register",
    "/api/projects/:path*",
    "/api/specs/:path*",
    "/api/builds/:path*",
    "/api/credentials/:path*",
    "/api/inputs/:path*",
    "/api/versions/:path*",
  ],
};
