import { request as httpRequest } from "node:http";
import { ProviderError } from "../../lib/errors";

/**
 * Production HTTPS routing for a deployed subdomain (Phase 19 / BE-11), via
 * Caddy's admin API — the same mechanism `execution/preview/provider.ts`
 * uses for preview subdomains (Phase 14), and subject to the same verified
 * quirks documented there: `srv0` must be bootstrapped once and never
 * re-bootstrapped, a duplicate route `@id` must go through `PATCH` not
 * `POST`, and the admin API must be called via `node:http` rather than
 * `fetch` (its automatic `Sec-Fetch-Mode` header gets rejected as a CORS
 * request). This module targets a different Caddy server block: it listens
 * on the production domain, not the preview one, but reuses the exact same
 * `:443`/`:80` listener strategy so Caddy's automatic HTTPS issues a real
 * certificate for whatever host matches — that automatic-cert behavior IS
 * the "SSL" this module provides; there is no separate certificate API to
 * call.
 */

const DEFAULT_CADDY_ADMIN_URL = "http://localhost:2019";
const DEFAULT_DEPLOY_DOMAIN = "kairopro.app";
const SERVER_ID = "srv-deploy";

function caddyAdminUrl(): string {
  return process.env.CADDY_ADMIN_URL ?? DEFAULT_CADDY_ADMIN_URL;
}

function deployDomain(): string {
  return process.env.KAIROPRO_DEPLOY_DOMAIN ?? DEFAULT_DEPLOY_DOMAIN;
}

export function hostFor(subdomain: string): string {
  return `${subdomain}.${deployDomain()}`;
}

export function deployedUrlFor(subdomain: string): string {
  return `https://${hostFor(subdomain)}`;
}

function routeId(subdomain: string): string {
  return `kairopro-deploy-${subdomain}`;
}

export function buildDeployRoute(
  subdomain: string,
  targetPort: number,
): Record<string, unknown> {
  return {
    "@id": routeId(subdomain),
    match: [{ host: [hostFor(subdomain)] }],
    handle: [
      {
        handler: "reverse_proxy",
        upstreams: [{ dial: `localhost:${targetPort}` }],
      },
    ],
  };
}

interface AdminResponse {
  status: number;
  body: string;
}

function adminRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<AdminResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, caddyAdminUrl());
    const payload = body !== undefined ? JSON.stringify(body) : undefined;

    const req = httpRequest(
      url,
      {
        method,
        agent: false,
        headers: payload
          ? {
              "content-type": "application/json",
              "content-length": Buffer.byteLength(payload),
            }
          : undefined,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString("utf8");
        });
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, body: data });
        });
      },
    );

    req.on("error", (cause) => {
      reject(
        new ProviderError({
          message: "Failed to reach the Caddy admin API",
          cause,
        }),
      );
    });

    if (payload) req.write(payload);
    req.end();
  });
}

async function ensureServerBootstrapped(): Promise<void> {
  const existing = await adminRequest(
    "GET",
    `/config/apps/http/servers/${SERVER_ID}`,
  );
  if (existing.status >= 200 && existing.status < 300) return;

  const res = await adminRequest("POST", "/config/apps", {
    http: { servers: { [SERVER_ID]: { listen: [":443", ":80"], routes: [] } } },
  });

  if (res.status < 200 || res.status >= 300) {
    throw new ProviderError({
      message: `Caddy admin API returned ${res.status} bootstrapping the deploy server`,
      details: { status: res.status, body: res.body },
    });
  }
}

/** Activates HTTPS routing for `subdomain`, reverse-proxying to
 * `targetPort` on this Docker host. Returns the deployed URL. */
export async function activateDeployRoute(
  subdomain: string,
  targetPort: number,
): Promise<string> {
  await ensureServerBootstrapped();

  const existing = await adminRequest("GET", `/id/${routeId(subdomain)}`);
  const route = buildDeployRoute(subdomain, targetPort);
  const res =
    existing.status >= 200 && existing.status < 300
      ? await adminRequest("PATCH", `/id/${routeId(subdomain)}`, route)
      : await adminRequest(
          "POST",
          `/config/apps/http/servers/${SERVER_ID}/routes`,
          route,
        );

  if (res.status < 200 || res.status >= 300) {
    throw new ProviderError({
      message: `Caddy admin API returned ${res.status} activating the deploy route`,
      details: { subdomain, status: res.status, body: res.body },
    });
  }

  return deployedUrlFor(subdomain);
}

/** Best-effort — a route that's already gone is not an error. */
export async function removeDeployRoute(subdomain: string): Promise<void> {
  await adminRequest("DELETE", `/id/${routeId(subdomain)}`).catch(
    () => undefined,
  );
}
