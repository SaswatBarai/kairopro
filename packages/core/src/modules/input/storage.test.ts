import net from "node:net";
import { afterAll, describe, expect, it } from "vitest";
import { ProviderError } from "../../lib/errors";
import {
  createObjectStorage,
  generateStoredName,
  sanitizeOriginalName,
  type ObjectStorage,
} from "./storage";

describe("stored-name generation (never from the upload)", () => {
  it("generates unique names with the sniffed-type extension", () => {
    const a = generateStoredName("application/pdf");
    const b = generateStoredName("application/pdf");
    expect(a).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(a).not.toBe(b);
    expect(generateStoredName("image/png")).toMatch(/\.png$/);
    expect(generateStoredName("image/svg+xml")).toMatch(/\.svg$/);
  });
});

describe("sanitizeOriginalName (display-only)", () => {
  it.each([
    ["../../etc/passwd", "passwd"],
    ["C:\\Users\\ada\\specs\\prd.docx", "prd.docx"],
    ["normal-prd.pdf", "normal-prd.pdf"],
    ["", null],
    ["../../", null],
    ["a".repeat(300), "a".repeat(200)],
  ])("sanitizes %j → %j", (input, expected) => {
    expect(sanitizeOriginalName(input)).toBe(expected);
  });

  it("strips control characters", () => {
    expect(sanitizeOriginalName("evil\x00\nname.pdf")).toBe("evilname.pdf");
  });

  it("a generated name is never derived from the original", () => {
    const hostile = "../../etc/passwd";
    const stored = generateStoredName("text/plain");
    expect(stored).not.toContain("passwd");
    expect(sanitizeOriginalName(hostile)).toBe("passwd"); // display only
  });
});

// ── Live MinIO roundtrip — skipped unless the dev object store is up ──────

function minioReachable(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: 9000 });
    const done = (result: boolean) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(500, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

const storage: ObjectStorage = createObjectStorage({
  endpoint: "http://127.0.0.1:9000",
  bucket: "kairopro-uploads",
  region: "us-east-1",
  accessKeyId: "minioadmin",
  secretAccessKey: "minioadmin",
});

describe("S3ObjectStorage against MinIO", async () => {
  const reachable = await minioReachable();
  (reachable ? describe : describe.skip)("live", () => {
    afterAll(async () => {
      await storage.deleteByPrefix("prj_storage_test");
    });

    it("puts and gets an object back byte-identical", async () => {
      const body = Buffer.from("kairopro storage roundtrip");
      await storage.put("prj_storage_test", "probe.txt", body, "text/plain");
      expect(await storage.get("prj_storage_test", "probe.txt")).toEqual(body);
    });

    it("deleteByPrefix removes every object under the project", async () => {
      await storage.put(
        "prj_storage_test",
        "one.txt",
        Buffer.from("1"),
        "text/plain",
      );
      await storage.put(
        "prj_storage_test",
        "nested/two.txt",
        Buffer.from("2"),
        "text/plain",
      );
      await storage.deleteByPrefix("prj_storage_test");
      await expect(
        storage.get("prj_storage_test", "one.txt"),
      ).rejects.toBeInstanceOf(ProviderError);
    });

    it("wraps storage failures as ProviderError", async () => {
      const broken = createObjectStorage({
        endpoint: "http://127.0.0.1:9", // nothing listens here
        bucket: "kairopro-uploads",
        region: "us-east-1",
        accessKeyId: "minioadmin",
        secretAccessKey: "minioadmin",
      });
      await expect(
        broken.put("prj_storage_test", "x.txt", Buffer.from("x"), "text/plain"),
      ).rejects.toBeInstanceOf(ProviderError);
    });
  });
});
