// Middleware placeholder — full auth protection added in Phase 2
// (NextAuth withAuth middleware)

export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*"],
};
