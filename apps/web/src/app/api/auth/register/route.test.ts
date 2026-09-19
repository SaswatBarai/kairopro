import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@kairopro/core", async (importOriginal) => {
  const original = await importOriginal<typeof import("@kairopro/core")>();
  const db = {
    user: { findUnique: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(db)),
  };
  return {
    ...original,
    db,
    hashPassword: vi.fn(),
    createPersonalOrg: vi.fn(),
  };
});

import { createPersonalOrg, db, hashPassword } from "@kairopro/core";
import { POST } from "./route";

function registerRequest(body: unknown) {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: "Ada Lovelace",
  email: "Ada@Lovelace.dev",
  password: "correct-horse-battery-staple",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/register", () => {
  it("creates a user and a personal org atomically, returning 201", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce(null);
    vi.mocked(hashPassword).mockReturnValueOnce("salt:hash");
    vi.mocked(db.user.create).mockResolvedValueOnce({
      id: "user-1",
      name: "Ada Lovelace",
      email: "ada@lovelace.dev",
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
    } as never);
    vi.mocked(createPersonalOrg).mockResolvedValueOnce({
      id: "org-1",
      name: "Ada Lovelace's Org",
    } as never);

    const res = await POST(registerRequest(validBody));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({
      id: "user-1",
      name: "Ada Lovelace",
      email: "ada@lovelace.dev",
      orgId: "org-1",
      createdAt: "2026-09-01T00:00:00.000Z",
    });

    // Email is normalized before the uniqueness check and the write.
    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { email: "ada@lovelace.dev" },
    });
    expect(db.user.create).toHaveBeenCalledWith({
      data: {
        name: "Ada Lovelace",
        email: "ada@lovelace.dev",
        passwordHash: "salt:hash",
      },
    });
    // The org is created through the shared seam auth.ts also uses — never
    // reimplemented inline in the route.
    expect(createPersonalOrg).toHaveBeenCalledWith(
      "user-1",
      "Ada Lovelace",
      expect.anything(),
    );
  });

  it("returns a conflict for a duplicate email, and never opens the transaction", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: "existing-user",
    } as never);

    const res = await POST(registerRequest(validBody));

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json).toEqual({
      error: {
        code: "CONFLICT",
        message: "A user with this email address already exists.",
      },
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an invalid payload with a 400 and never touches the database", async () => {
    const res = await POST(
      registerRequest({ name: "", email: "not-an-email" }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("rolls back — no org is created — when the transaction fails partway", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce(null);
    vi.mocked(hashPassword).mockReturnValueOnce("salt:hash");
    vi.mocked(db.$transaction).mockRejectedValueOnce(
      new Error("connection reset"),
    );

    const res = await POST(registerRequest(validBody));

    expect(res.status).toBe(500);
    expect(createPersonalOrg).not.toHaveBeenCalled();
  });
});
