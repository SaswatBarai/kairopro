import { request as httpRequest } from "node:http";
import { ProviderError } from "../../../lib/errors";

/**
 * Preview subdomain allocation (Phase 14 / BE-9) via Caddy's admin API
 * (`docker/Caddyfile`) — not a static config file edit, since routes come
 * and go per project without restarting Caddy. Separate from
 * `DockerRuntime.provision()`: that returns a working `http://localhost:<port>`
 * preview URL on its own (real, testable in any dev environment); this is
 * the opt-in production layer for a real domain + HTTPS, active only when
 * `CADDY_ADMIN_URL` is configured.
 *
 * Every claim below is verified against a running `caddy:2-alpine`
 * instance, not assumed from the docs:
 *
 * - POSTing a route straight to `apps/http/servers/srv0/routes` on a fresh
 *   Caddy instance fails with "invalid traversal path" — the admin API can
 *   append to an existing array at a path, but won't materialize missing
 *   intermediate objects for a path that doesn't exist yet. `srv0` has to
 *   exist first (`ensureServerBootstrapped`).
 * - Re-running that bootstrap once `srv0` already exists **replaces** it,
 *   silently wiping every route already registered — so
 *   `ensureServerBootstrapped` checks before it ever writes.
 * - Requests via Node's global `fetch` get rejected with 403 ("client is
 *   not allowed to access from origin ''), even from plain
 *   `http://localhost`, while the identical request via `curl` or Node's
 *   `http` module succeeds. The difference is `fetch`'s automatic
 *   `Sec-Fetch-Mode: cors` header — Caddy's admin API treats its presence
 *   as a browser-context signal and enforces origin checking that a
 *   same-host server-to-server call was never going to pass. That's why
 *   this file uses `node:http` directly instead of `fetch`.
 */

const DEFAULT_CADDY_ADMIN_URL = "http://localhost:2019";
const DEFAULT_PREVIEW_DOMAIN = "preview.kairopro.local";
const SERVER_ID = "srv0";

function caddyAdminUrl(): string {
  return process.env.CADDY_ADMIN_URL ?? DEFAULT_CADDY_ADMIN_URL;
}

function previewDomain(): string {
  return process.env.KAIROPRO_PREVIEW_DOMAIN ?? DEFAULT_PREVIEW_DOMAIN;
}

export function subdomainFor(projectId: string): string {
  return `${projectId}.${previewDomain()}`;
}

export function previewUrlFor(projectId: string): string {
  return `https://${subdomainFor(projectId)}`;
}

function routeId(projectId: string): string {
  return `kairopro-preview-${projectId}`;
}

/** The Caddy route config for one project — a host-matched reverse proxy
 * to the app container's published port on this Docker host. */
export function buildCaddyRoute(
  projectId: string,
  targetPort: number,
): Record<string, unknown> {
  return {
    "@id": routeId(projectId),
    match: [{ host: [subdomainFor(projectId)] }],
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

/** A minimal HTTP client for Caddy's admin API — deliberately not `fetch`;
 * see the module doc for why. */
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
        // No connection reuse: Caddy's admin server sends `Connection:
        // close` on some responses (verified), and Node's default
        // keep-alive agent reusing that socket for the next call in the
        // same process produces "socket hang up" — a fresh connection per
        // call sidesteps it entirely.
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

/** Creates `apps.http.servers.srv0` (listening on :80 and :443, so Caddy's
 * automatic HTTPS can issue certificates for matched hostnames) if and only
 * if it doesn't already exist — see the module doc for why re-running this
 * unconditionally would wipe every route already registered. */
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
      message: `Caddy admin API returned ${res.status} bootstrapping the preview server`,
      details: { status: res.status, body: res.body },
    });
  }
}

/** Adds (or replaces) the project's route in Caddy's running config via
 * its admin API — no Caddy restart, no static file edit. */
export async function registerPreviewRoute(
  projectId: string,
  targetPort: number,
): Promise<string> {
  await ensureServerBootstrapped();

  // Caddy's admin API errors on a duplicate `@id` rather than replacing it,
  // so an already-registered route (e.g. re-provisioning a project) has to
  // go through `PATCH /id/<id>` instead of appending via POST — verified
  // against a running instance: POSTing a second route with the same `@id`
  // fails with "duplicate ID ... found at .../routes/N and .../routes/M".
  const existing = await adminRequest("GET", `/id/${routeId(projectId)}`);
  const route = buildCaddyRoute(projectId, targetPort);
  const res =
    existing.status >= 200 && existing.status < 300
      ? await adminRequest("PATCH", `/id/${routeId(projectId)}`, route)
      : await adminRequest(
          "POST",
          `/config/apps/http/servers/${SERVER_ID}/routes`,
          route,
        );

  if (res.status < 200 || res.status >= 300) {
    throw new ProviderError({
      message: `Caddy admin API returned ${res.status} registering the preview route`,
      details: { projectId, status: res.status, body: res.body },
    });
  }

  return previewUrlFor(projectId);
}

/** Removes the project's route. Best-effort — a route that's already gone
 * (or a Caddy that isn't reachable) is not an error at teardown time. */
export async function removePreviewRoute(projectId: string): Promise<void> {
  await adminRequest("DELETE", `/id/${routeId(projectId)}`).catch(
    () => undefined,
  );
}
