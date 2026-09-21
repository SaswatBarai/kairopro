import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `provider.ts` deliberately uses `node:http` instead of `fetch` (see its
 * module doc — `fetch`'s automatic `Sec-Fetch-Mode` header gets rejected by
 * Caddy's admin API). Mocking `node:http` here, rather than `fetch`, keeps
 * this test honest about which client is actually used. The full
 * register/re-register/remove lifecycle was additionally verified by hand
 * against a live `caddy:2-alpine` container — this test locks in that
 * behavior against a mock so it can't silently regress.
 */

interface Call {
  method: string;
  path: string;
  body?: string;
}

const calls: Call[] = [];
let responder: (call: Call) => { status: number; body: string };

vi.mock("node:http", () => ({
  request: (
    url: URL,
    options: { method: string; headers?: Record<string, unknown> },
    callback: (res: EventEmitter & { statusCode?: number }) => void,
  ) => {
    const req = new EventEmitter() as EventEmitter & {
      write: (chunk: string) => void;
      end: () => void;
    };
    let body = "";
    req.write = (chunk: string) => {
      body += chunk;
    };
    req.end = () => {
      const call: Call = { method: options.method, path: url.pathname, body };
      calls.push(call);
      const { status, body: resBody } = responder(call);
      const res = new EventEmitter() as EventEmitter & { statusCode?: number };
      res.statusCode = status;
      callback(res);
      queueMicrotask(() => {
        res.emit("data", Buffer.from(resBody));
        res.emit("end");
      });
    };
    return req;
  },
}));

const { registerPreviewRoute, removePreviewRoute, previewUrlFor } =
  await import("./provider");

describe("preview provider (BE-9)", () => {
  beforeEach(() => {
    calls.length = 0;
    process.env.CADDY_ADMIN_URL = "http://localhost:2019";
    process.env.KAIROPRO_PREVIEW_DOMAIN = "preview.kairopro.local";
  });

  afterEach(() => {
    delete process.env.CADDY_ADMIN_URL;
    delete process.env.KAIROPRO_PREVIEW_DOMAIN;
  });

  it("bootstraps the server only when it doesn't already exist, then appends the route", async () => {
    const routeIds = new Set<string>();
    responder = (call) => {
      if (
        call.method === "GET" &&
        call.path === "/config/apps/http/servers/srv0"
      ) {
        return { status: 404, body: "" };
      }
      if (call.method === "POST" && call.path === "/config/apps") {
        return { status: 200, body: "" };
      }
      if (call.method === "GET" && call.path.startsWith("/id/")) {
        const id = call.path.slice("/id/".length);
        return routeIds.has(id)
          ? { status: 200, body: "{}" }
          : { status: 404, body: "" };
      }
      if (
        call.method === "POST" &&
        call.path === "/config/apps/http/servers/srv0/routes"
      ) {
        routeIds.add(JSON.parse(call.body ?? "{}")["@id"]);
        return { status: 200, body: "" };
      }
      throw new Error(`unexpected call: ${call.method} ${call.path}`);
    };

    const url = await registerPreviewRoute("proj1", 3000);

    expect(url).toBe(previewUrlFor("proj1"));
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "GET /config/apps/http/servers/srv0",
      "POST /config/apps",
      "GET /id/kairopro-preview-proj1",
      "POST /config/apps/http/servers/srv0/routes",
    ]);
  });

  it("skips bootstrap when the server already exists", async () => {
    responder = (call) => {
      if (
        call.method === "GET" &&
        call.path === "/config/apps/http/servers/srv0"
      ) {
        return { status: 200, body: "{}" };
      }
      if (call.method === "GET" && call.path.startsWith("/id/")) {
        return { status: 404, body: "" };
      }
      if (
        call.method === "POST" &&
        call.path === "/config/apps/http/servers/srv0/routes"
      ) {
        return { status: 200, body: "" };
      }
      throw new Error(`unexpected call: ${call.method} ${call.path}`);
    };

    await registerPreviewRoute("proj1", 3000);

    expect(
      calls.some((c) => c.method === "POST" && c.path === "/config/apps"),
    ).toBe(false);
  });

  it("re-registering an existing route PATCHes by @id instead of POSTing a duplicate", async () => {
    responder = (call) => {
      if (
        call.method === "GET" &&
        call.path === "/config/apps/http/servers/srv0"
      ) {
        return { status: 200, body: "{}" };
      }
      if (call.method === "GET" && call.path === "/id/kairopro-preview-proj1") {
        return { status: 200, body: "{}" }; // already registered
      }
      if (
        call.method === "PATCH" &&
        call.path === "/id/kairopro-preview-proj1"
      ) {
        return { status: 200, body: "" };
      }
      throw new Error(`unexpected call: ${call.method} ${call.path}`);
    };

    const url = await registerPreviewRoute("proj1", 3005);

    expect(url).toBe(previewUrlFor("proj1"));
    expect(
      calls.some((c) => c.method === "POST" && c.path.endsWith("/routes")),
    ).toBe(false);
    expect(
      calls.some(
        (c) => c.method === "PATCH" && c.path === "/id/kairopro-preview-proj1",
      ),
    ).toBe(true);
  });

  it("throws ProviderError when Caddy rejects the route registration", async () => {
    responder = (call) => {
      if (
        call.method === "GET" &&
        call.path === "/config/apps/http/servers/srv0"
      ) {
        return { status: 200, body: "{}" };
      }
      if (call.method === "GET" && call.path.startsWith("/id/")) {
        return { status: 404, body: "" };
      }
      return { status: 400, body: '{"error":"bad route"}' };
    };

    await expect(registerPreviewRoute("proj1", 3000)).rejects.toThrow(
      /Caddy admin API returned 400/,
    );
  });

  it("removePreviewRoute deletes by id and swallows errors", async () => {
    responder = (call) => {
      expect(call.method).toBe("DELETE");
      expect(call.path).toBe("/id/kairopro-preview-proj1");
      return { status: 404, body: "" }; // already gone — still resolves
    };

    await expect(removePreviewRoute("proj1")).resolves.toBeUndefined();
  });
});
