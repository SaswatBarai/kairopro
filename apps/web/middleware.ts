import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from "next-auth/middleware";

const authMiddleware = withAuth({
  pages: {
    signIn: "/login",
  },
});

export default async function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  const previewMatch = host.match(/^([a-z0-9-]+)\.preview\.localhost(:\d+)?$/) || 
                       host.match(/^([a-z0-9-]+)\.preview\.kairopro\.in$/);

  if (previewMatch) {
    // projectId or slug
    const projectId = previewMatch[1];
    
    // In a real app we'd fetch this from Redis to avoid hitting Postgres on every request.
    // For now we assume the container exposes port 3000 mapped to some dynamic host port,
    // but in our implementation we haven't mapped ports explicitly. We'll proxy to a fixed port
    // for this local setup, assuming standard Next.js app in the container is on 3000 and mapped to 8080.
    const containerPort = 8080; 
    
    return NextResponse.rewrite(new URL(`http://localhost:${containerPort}${req.nextUrl.pathname}`));
  }

  // Check auth routes
  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/projects')) {
      // @ts-ignore - next-auth middleware types can be slightly strict
      return authMiddleware(req, null as any);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
      "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
