import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "@kairopro/core";

vi.mock("@/lib/request-context", () => ({
  getRequestContext: vi.fn().mockResolvedValue({
    userId: "user-1",
    orgId: "org-1",
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@kairopro/core", async (importOriginal) => {
  const original = await importOriginal<typeof import("@kairopro/core")>();
  return {
    ...original,
    putCredential: vi.fn(),
    deleteCredential: vi.fn(),
  };
});

import { deleteCredential, putCredential } from "@kairopro/core";
import { DELETE, PUT } from "./route";

const routeContext = {
  params: Promise.resolve({ id: "prj-1", service: "stripe" }),
};

function putRequest(body: unknown) {
  return new Request("http://x", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PUT /api/projects/[id]/credentials/[service]", () => {
  it("stores the values and returns the masked result", async () => {
    vi.mocked(putCredential).mockResolvedValueOnce({
      service: "stripe",
      status: "CONNECTED",
      fields: [
        { key: "secretKey", label: "Secret Key", maskedValue: "••••••••c123" },
      ],
    } as never);

    const res = await PUT(
      putRequest({ values: { secretKey: "sk_live_abc123" } }),
      routeContext,
    );

    expect(res.status).toBe(200);
    expect(putCredential).toHaveBeenCalledWith(
      "prj-1",
      { service: "stripe", values: { secretKey: "sk_live_abc123" } },
      { userId: "user-1", orgId: "org-1" },
    );
    const json = await res.json();
    expect(json.fields[0].maskedValue).not.toContain("abc123".slice(0, 3));
  });

  it("rejects an unknown service in the URL before calling the service layer", async () => {
    const res = await PUT(putRequest({ values: { x: "y" } }), {
      params: Promise.resolve({ id: "prj-1", service: "not_a_service" }),
    });

    expect(res.status).toBe(400);
    expect(putCredential).not.toHaveBeenCalled();
  });

  it("rejects an empty values object before calling the service layer", async () => {
    const res = await PUT(putRequest({ values: {} }), routeContext);

    expect(res.status).toBe(400);
    expect(putCredential).not.toHaveBeenCalled();
  });

  it("propagates a conflict from the service layer", async () => {
    vi.mocked(putCredential).mockRejectedValueOnce(
      new ConflictError({ message: "conflict" }),
    );

    const res = await PUT(
      putRequest({ values: { secretKey: "sk_live_abc123" } }),
      routeContext,
    );

    expect(res.status).toBe(409);
  });
});

describe("DELETE /api/projects/[id]/credentials/[service]", () => {
  it("deletes and returns 204", async () => {
    vi.mocked(deleteCredential).mockResolvedValueOnce(undefined);

    const res = await DELETE(new Request("http://x"), routeContext);

    expect(res.status).toBe(204);
    expect(deleteCredential).toHaveBeenCalledWith("prj-1", "stripe", {
      userId: "user-1",
      orgId: "org-1",
    });
  });

  it("returns 404 for a foreign project", async () => {
    vi.mocked(deleteCredential).mockRejectedValueOnce(
      new NotFoundError({ message: "Project not found" }),
    );

    const res = await DELETE(new Request("http://x"), routeContext);

    expect(res.status).toBe(404);
  });

  it("rejects an unknown service in the URL before calling the service layer", async () => {
    const res = await DELETE(new Request("http://x"), {
      params: Promise.resolve({ id: "prj-1", service: "not_a_service" }),
    });

    expect(res.status).toBe(400);
    expect(deleteCredential).not.toHaveBeenCalled();
  });
});
