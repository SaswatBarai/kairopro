import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { logger } from "@kairopro/core";

/**
 * GitHub webhook receiver (Phase 19 / BE-11). No session — GitHub calls
 * this directly, so authenticity comes entirely from the HMAC-SHA256
 * signature in `X-Hub-Signature-256`, verified with a constant-time
 * comparison (`timingSafeEqual`) so response timing can't leak how much of
 * the signature matched.
 *
 * V1 only acknowledges events (used to confirm the webhook is reachable
 * when connecting a repo) — no deliverable in this phase asks for
 * push-triggered rebuilds, so none is implemented here.
 */
function verifySignature(payload: string, signature: string | null): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected =
    "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

export async function POST(req: Request): Promise<NextResponse> {
  const payload = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifySignature(payload, signature)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid signature" } },
      { status: 401 },
    );
  }

  const event = req.headers.get("x-github-event") ?? "unknown";
  logger.info({ event }, "github webhook received");
  return NextResponse.json({ ok: true });
}
