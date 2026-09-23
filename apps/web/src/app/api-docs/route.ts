import { NextResponse } from "next/server";

/**
 * Interactive API reference (Scalar) for every route under
 * apps/web/src/app/api — reads the static spec at /openapi.json. Loaded
 * from Scalar's CDN, no new npm dependency. "Try it" requests are
 * same-origin fetches, so the browser sends the NextAuth session cookie
 * automatically once you're logged in through the app in this tab.
 */
const html = `<!doctype html>
<html>
  <head>
    <title>KairoPro API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

export async function GET(): Promise<NextResponse> {
  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
