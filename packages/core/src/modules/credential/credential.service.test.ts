import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../lib/context";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { encryptField } from "../../platform/crypto/encryption";

vi.mock("../../platform/db/client", () => ({ db: {} }));
vi.mock("../org/access", () => ({ ownerOf: vi.fn() }));
vi.mock("./credential.repository", () => ({
  findCredential: vi.fn(),
  listCredentialsByProject: vi.fn(),
  upsertCredentialSecrets: vi.fn(),
  deleteCredentialRow: vi.fn(),
}));
vi.mock("./inject", () => ({ injectCredentialsEnv: vi.fn() }));

import { ownerOf } from "../org/access";
import {
  deleteCredentialRow,
  findCredential,
  listCredentialsByProject,
  upsertCredentialSecrets,
  type CredentialRow,
} from "./credential.repository";
import { injectCredentialsEnv } from "./inject";
import {
  deleteCredential,
  listCredentials,
  putCredential,
} from "./credential.service";

const ctx: RequestContext = { userId: "user-1", orgId: "org-1" };
const projectId = "prj-1";
const SECRET = "sk_live_super_secret_value_123";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.KAIROPRO_ENCRYPTION_KEY = "7".repeat(64);
  vi.mocked(ownerOf).mockResolvedValue({ id: projectId } as never);
});

describe("putCredential (BE-7)", () => {
  it("stores ciphertext, never plaintext, and injects the workspace .env", async () => {
    vi.mocked(findCredential).mockResolvedValue(null);
    vi.mocked(upsertCredentialSecrets).mockImplementation(
      (pid, service, secrets) =>
        Promise.resolve({
          id: "cred-1",
          projectId: pid,
          service,
          secrets,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as CredentialRow),
    );

    const result = await putCredential(
      projectId,
      { service: "stripe", values: { secretKey: SECRET } },
      ctx,
    );

    const [, , storedSecrets] = vi.mocked(upsertCredentialSecrets).mock
      .calls[0]!;
    expect(JSON.stringify(storedSecrets)).not.toContain(SECRET);
    expect(injectCredentialsEnv).toHaveBeenCalledWith(projectId);
    expect(result.fields[0]!.maskedValue.endsWith(SECRET.slice(-4))).toBe(true);
    expect(result.fields[0]!.maskedValue).not.toContain(SECRET);
  });

  it("rejects an unknown service", async () => {
    await expect(
      putCredential(
        projectId,
        { service: "unknown_service" as never, values: { x: "y" } },
        ctx,
      ),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects an unknown field for a known service", async () => {
    vi.mocked(findCredential).mockResolvedValue(null);
    await expect(
      putCredential(
        projectId,
        { service: "stripe", values: { notARealField: "x" } },
        ctx,
      ),
    ).rejects.toThrow(ValidationError);
  });

  it("merges into existing fields rather than overwriting them", async () => {
    vi.mocked(findCredential).mockResolvedValue({
      id: "cred-1",
      projectId,
      service: "google_oauth",
      secrets: {
        clientId: encryptField(
          "existing-client-id",
          Buffer.from("7".repeat(64), "hex"),
        ),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as CredentialRow);
    vi.mocked(upsertCredentialSecrets).mockImplementation(
      (pid, service, secrets) =>
        Promise.resolve({
          id: "cred-1",
          projectId: pid,
          service,
          secrets,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as CredentialRow),
    );

    await putCredential(
      projectId,
      { service: "google_oauth", values: { clientSecret: SECRET } },
      ctx,
    );

    const [, , storedSecrets] = vi.mocked(upsertCredentialSecrets).mock
      .calls[0]!;
    expect(Object.keys(storedSecrets as object)).toEqual(
      expect.arrayContaining(["clientId", "clientSecret"]),
    );
  });

  it("returns 404 for a project the caller cannot access", async () => {
    vi.mocked(ownerOf).mockResolvedValue(null);
    await expect(
      putCredential(
        projectId,
        { service: "stripe", values: { secretKey: SECRET } },
        ctx,
      ),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("listCredentials (BE-7)", () => {
  it("returns masked values and CONNECTED only when every field is set", async () => {
    vi.mocked(listCredentialsByProject).mockResolvedValue([
      {
        id: "cred-1",
        projectId,
        service: "stripe",
        // Real ciphertext via the actual crypto module, keyed with the
        // same KAIROPRO_ENCRYPTION_KEY set in beforeEach, so the mask
        // reflects a real round-trip, not a hand-authored fixture.
        secrets: {
          secretKey: encryptField(SECRET, Buffer.from("7".repeat(64), "hex")),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as unknown as CredentialRow[]);

    const list = await listCredentials(projectId, ctx);
    const stripe = list.find((c) => c.service === "stripe")!;
    const google = list.find((c) => c.service === "google_oauth")!;

    expect(stripe.status).toBe("CONNECTED");
    expect(stripe.fields[0]!.maskedValue).toContain(SECRET.slice(-4));
    expect(stripe.fields[0]!.maskedValue).not.toContain(SECRET);
    expect(google.status).toBe("UNCONFIGURED");
    expect(google.fields.every((f) => f.maskedValue === "")).toBe(true);
  });
});

describe("deleteCredential (BE-7)", () => {
  it("removes the row and rewrites the workspace .env", async () => {
    await deleteCredential(projectId, "sendgrid", ctx);
    expect(deleteCredentialRow).toHaveBeenCalledWith(projectId, "sendgrid");
    expect(injectCredentialsEnv).toHaveBeenCalledWith(projectId);
  });

  it("rejects an unknown service", async () => {
    await expect(
      deleteCredential(projectId, "unknown_service" as never, ctx),
    ).rejects.toThrow(ValidationError);
  });
});

describe("security: no plaintext secret ever reaches stdout (BE-7)", () => {
  it("never logs the plaintext secret during a create/read cycle", async () => {
    vi.mocked(findCredential).mockResolvedValue(null);
    vi.mocked(upsertCredentialSecrets).mockImplementation(
      (pid, service, secrets) =>
        Promise.resolve({
          id: "cred-1",
          projectId: pid,
          service,
          secrets,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as CredentialRow),
    );

    const chunks: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.stdout as any).write = (chunk: unknown) => {
      chunks.push(typeof chunk === "string" ? chunk : String(chunk));
      return true;
    };

    try {
      await putCredential(
        projectId,
        { service: "stripe", values: { secretKey: SECRET } },
        ctx,
      );
      vi.mocked(listCredentialsByProject).mockResolvedValue([
        {
          id: "cred-1",
          projectId,
          service: "stripe",
          secrets: vi.mocked(upsertCredentialSecrets).mock.calls[0]![2],
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as CredentialRow,
      ]);
      await listCredentials(projectId, ctx);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(chunks.join("")).not.toContain(SECRET);
  });
});
