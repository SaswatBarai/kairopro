import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../lib/context";
import { NotFoundError, ValidationError } from "../../lib/errors";
import type { InputRow } from "./input.repository";

vi.mock("../org/access", () => ({
  ownerOf: vi.fn(),
}));

vi.mock("./input.repository", () => ({
  createInput: vi.fn(),
  countFileInputs: vi.fn(),
  deleteInputsByStoredNames: vi.fn(),
  deleteInputRow: vi.fn(),
  findInputById: vi.fn(),
  findTextInput: vi.fn(),
  listInputsByProject: vi.fn(),
  updateInput: vi.fn(),
}));

const mockStorage = {
  put: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(Buffer.from("")),
  deleteObject: vi.fn().mockResolvedValue(undefined),
  deleteByPrefix: vi.fn().mockResolvedValue(undefined),
};

vi.mock("./storage", async (importOriginal) => {
  const original = await importOriginal<typeof import("./storage")>();
  return {
    ...original,
    getObjectStorage: () => mockStorage,
  };
});

import { ownerOf } from "../org/access";
import {
  countFileInputs,
  createInput,
  deleteInputRow,
  deleteInputsByStoredNames,
  findInputById,
  findTextInput,
  listInputsByProject,
  updateInput,
} from "./input.repository";
import {
  createFileInputs,
  deleteInput,
  listInputs,
  purgeProjectUploads,
  saveTextInput,
} from "./input.service";

const ctx: RequestContext = { userId: "user-1", orgId: "org-1" };

function fakeInputRow(overrides: Partial<InputRow> = {}): InputRow {
  return {
    id: "inp-1",
    projectId: "prj-1",
    kind: "FILE",
    originalName: "spec.pdf",
    mimeType: "application/pdf",
    storedName: "12345678-1234-1234-1234-123456789abc.pdf",
    sizeBytes: 1024,
    extraction: "Sample PDF text",
    createdAt: new Date("2026-09-01T09:00:00Z"),
    updatedAt: new Date("2026-09-01T09:00:00Z"),
    ...overrides,
  };
}

describe("input.service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(ownerOf).mockResolvedValue({
      id: "prj-1",
      orgId: "org-1",
    } as any);
    mockStorage.put.mockResolvedValue(undefined);
    mockStorage.get.mockResolvedValue(Buffer.from(""));
    mockStorage.deleteObject.mockResolvedValue(undefined);
    mockStorage.deleteByPrefix.mockResolvedValue(undefined);
  });

  describe("listInputs", () => {
    it("returns mapped inputs for an owned project", async () => {
      vi.mocked(listInputsByProject).mockResolvedValueOnce([
        fakeInputRow({
          kind: "TEXT",
          originalName: null,
          mimeType: null,
          extraction: "text",
        }),
        fakeInputRow({ id: "inp-2", originalName: "doc.pdf" }),
      ]);

      const items = await listInputs("prj-1", ctx);
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({
        id: "inp-1",
        projectId: "prj-1",
        kind: "TEXT",
        originalName: null,
        mimeType: null,
        sizeBytes: 1024,
        extraction: "text",
        createdAt: "2026-09-01T09:00:00.000Z",
      });
      // Stored name is never in the contract
      expect(items[0]).not.toHaveProperty("storedName");
      expect(items[1]).not.toHaveProperty("storedName");
    });

    it("throws NotFoundError for a foreign project", async () => {
      vi.mocked(ownerOf).mockResolvedValueOnce(null);
      await expect(listInputs("prj-foreign", ctx)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("saveTextInput", () => {
    it("creates a new TEXT input if none exists", async () => {
      vi.mocked(findTextInput).mockResolvedValueOnce(null);
      vi.mocked(createInput).mockResolvedValueOnce(
        fakeInputRow({
          id: "inp-text-1",
          kind: "TEXT",
          originalName: null,
          mimeType: null,
          sizeBytes: 12,
          extraction: "Requirements",
        }),
      );

      const result = await saveTextInput("prj-1", "Requirements", ctx);
      expect(result.id).toBe("inp-text-1");
      expect(result.kind).toBe("TEXT");
      expect(result.extraction).toBe("Requirements");
      expect(createInput).toHaveBeenCalledWith({
        projectId: "prj-1",
        kind: "TEXT",
        originalName: null,
        mimeType: null,
        storedName: "",
        sizeBytes: 12,
        extraction: "Requirements",
      });
    });

    it("updates existing TEXT input if one already exists", async () => {
      vi.mocked(findTextInput).mockResolvedValueOnce(
        fakeInputRow({ id: "inp-text-existing", kind: "TEXT" }),
      );
      vi.mocked(updateInput).mockResolvedValueOnce(
        fakeInputRow({
          id: "inp-text-existing",
          kind: "TEXT",
          extraction: "Updated text",
          sizeBytes: 12,
        }),
      );

      const result = await saveTextInput("prj-1", "Updated text", ctx);
      expect(result.id).toBe("inp-text-existing");
      expect(updateInput).toHaveBeenCalledWith("inp-text-existing", {
        extraction: "Updated text",
        sizeBytes: 12,
      });
    });

    it("rejects empty text or whitespace with ValidationError", async () => {
      await expect(saveTextInput("prj-1", "", ctx)).rejects.toBeInstanceOf(
        ValidationError,
      );
      await expect(saveTextInput("prj-1", "   ", ctx)).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it("rejects text exceeding 50,000 chars", async () => {
      await expect(
        saveTextInput("prj-1", "a".repeat(50_001), ctx),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe("createFileInputs (table-driven upload validation)", () => {
    const validPdf = Buffer.from("%PDF-1.4\nminimal pdf");
    const validDocx = Buffer.from("PK\x03\x04minimal docx");
    const validTxt = Buffer.from("plain text content");
    const validMd = Buffer.from("# Markdown\n\n- item 1");
    const validPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0,
    ]);
    const validJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
    const validSvg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    );

    it.each([
      ["PDF", validPdf, "application/pdf"],
      [
        "DOCX",
        validDocx,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      ["TXT", validTxt, "text/plain"],
      ["MD", validMd, "text/markdown"],
      ["PNG", validPng, "image/png"],
      ["JPG", validJpg, "image/jpeg"],
      ["SVG", validSvg, "image/svg+xml"],
    ])(
      "accepts allowlisted file type: %s",
      async (_type, buffer, expectedMime) => {
        vi.mocked(countFileInputs).mockResolvedValueOnce(0);
        vi.mocked(createInput).mockImplementationOnce(async (data: any) =>
          fakeInputRow({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        );

        const results = await createFileInputs(
          "prj-1",
          [{ buffer, originalName: "file.ext" }],
          ctx,
        );
        expect(results).toHaveLength(1);
        expect(results[0]!.mimeType).toBe(expectedMime);
        expect(mockStorage.put).toHaveBeenCalledWith(
          "prj-1",
          expect.stringMatching(/^[0-9a-f-]{36}\.[a-z0-9]+$/),
          buffer,
          expectedMime,
        );
      },
    );

    it.each([
      ["binary executable", Buffer.from([0x00, 0x01, 0x02, 0x03])],
      ["GIF image", Buffer.from("GIF89a\x00\x00\x00\x00\x00\x00\x00")],
      [
        "MP4 video",
        Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]),
      ],
      [
        "WASM binary",
        Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]),
      ],
    ])("rejects unallowlisted file type: %s", async (_type, buffer) => {
      vi.mocked(countFileInputs).mockResolvedValueOnce(0);

      await expect(
        createFileInputs(
          "prj-1",
          [{ buffer, originalName: "dangerous.file" }],
          ctx,
        ),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockStorage.put).not.toHaveBeenCalled();
    });

    it("rejects empty buffer (0 bytes) before storage", async () => {
      vi.mocked(countFileInputs).mockResolvedValueOnce(0);

      await expect(
        createFileInputs(
          "prj-1",
          [{ buffer: Buffer.alloc(0), originalName: "empty.txt" }],
          ctx,
        ),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockStorage.put).not.toHaveBeenCalled();
    });

    it("rejects file over 10MB before storage", async () => {
      vi.mocked(countFileInputs).mockResolvedValueOnce(0);
      const oversize = Buffer.alloc(10 * 1024 * 1024 + 1);

      await expect(
        createFileInputs(
          "prj-1",
          [{ buffer: oversize, originalName: "huge.pdf" }],
          ctx,
        ),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockStorage.put).not.toHaveBeenCalled();
    });

    it("rejects a sixth file when project already has 5 files", async () => {
      vi.mocked(countFileInputs).mockResolvedValueOnce(5);

      await expect(
        createFileInputs(
          "prj-1",
          [{ buffer: validTxt, originalName: "sixth.txt" }],
          ctx,
        ),
      ).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
        message: expect.stringContaining("at most 5 files"),
      });
      expect(mockStorage.put).not.toHaveBeenCalled();
    });

    it("rejects batch that would exceed max 5 files total", async () => {
      vi.mocked(countFileInputs).mockResolvedValueOnce(4);

      await expect(
        createFileInputs(
          "prj-1",
          [
            { buffer: validTxt, originalName: "f1.txt" },
            { buffer: validTxt, originalName: "f2.txt" },
          ],
          ctx,
        ),
      ).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
        message: expect.stringContaining(
          "at most 5 files (4 already attached)",
        ),
      });
      expect(mockStorage.put).not.toHaveBeenCalled();
    });

    it("stored filename is generated and never taken from original filename", async () => {
      vi.mocked(countFileInputs).mockResolvedValueOnce(0);
      vi.mocked(createInput).mockImplementationOnce(async (data: any) =>
        fakeInputRow({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      await createFileInputs(
        "prj-1",
        [{ buffer: validTxt, originalName: "../../etc/passwd" }],
        ctx,
      );

      const putCall = mockStorage.put.mock.calls[0]!;
      const storedKey = putCall[1] as string;
      expect(storedKey).not.toContain("passwd");
      expect(storedKey).toMatch(/^[0-9a-f-]{36}\.txt$/);
    });

    it("rolls back stored objects if an error occurs partway", async () => {
      vi.mocked(countFileInputs).mockResolvedValueOnce(0);
      mockStorage.put
        .mockResolvedValueOnce(undefined) // first succeeds
        .mockRejectedValueOnce(new Error("Storage network drop")); // second fails

      await expect(
        createFileInputs(
          "prj-1",
          [
            { buffer: validTxt, originalName: "f1.txt" },
            { buffer: validTxt, originalName: "f2.txt" },
          ],
          ctx,
        ),
      ).rejects.toThrow("Storage network drop");

      // Verifies cleanup of the first file that was put
      expect(mockStorage.deleteObject).toHaveBeenCalledTimes(1);
      expect(deleteInputsByStoredNames).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteInput", () => {
    it("deletes stored object and DB row", async () => {
      vi.mocked(findInputById).mockResolvedValueOnce(
        fakeInputRow({
          id: "inp-1",
          projectId: "prj-1",
          storedName: "abc.pdf",
          kind: "FILE",
        }),
      );

      await deleteInput("prj-1", "inp-1", ctx);

      expect(mockStorage.deleteObject).toHaveBeenCalledWith("prj-1", "abc.pdf");
      expect(deleteInputRow).toHaveBeenCalledWith("inp-1");
    });

    it("throws NotFoundError if input belongs to another project", async () => {
      vi.mocked(findInputById).mockResolvedValueOnce(
        fakeInputRow({ id: "inp-foreign", projectId: "prj-foreign" }),
      );

      await expect(
        deleteInput("prj-1", "inp-foreign", ctx),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(mockStorage.deleteObject).not.toHaveBeenCalled();
      expect(deleteInputRow).not.toHaveBeenCalled();
    });

    it("does not fail if storage delete errors (best-effort)", async () => {
      vi.mocked(findInputById).mockResolvedValueOnce(
        fakeInputRow({
          id: "inp-1",
          projectId: "prj-1",
          storedName: "missing.pdf",
        }),
      );
      mockStorage.deleteObject.mockRejectedValueOnce(new Error("S3 down"));

      await deleteInput("prj-1", "inp-1", ctx);

      expect(deleteInputRow).toHaveBeenCalledWith("inp-1");
    });
  });

  describe("purgeProjectUploads", () => {
    it("calls deleteByPrefix for the project", async () => {
      await purgeProjectUploads("prj-1");
      expect(mockStorage.deleteByPrefix).toHaveBeenCalledWith("prj-1");
    });
  });
});
