import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { DELETE } from "./[inputId]/route";
import { NotFoundError, ValidationError } from "@kairopro/core";

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
    listInputs: vi.fn(),
    saveTextInput: vi.fn(),
    createFileInputs: vi.fn(),
    deleteInput: vi.fn(),
  };
});

import {
  createFileInputs,
  deleteInput,
  listInputs,
  saveTextInput,
} from "@kairopro/core";

const routeContext = { params: Promise.resolve({ id: "prj-1" }) };
const singleInputRouteContext = {
  params: Promise.resolve({ id: "prj-1", inputId: "inp-1" }),
};

describe("Inputs API Routes (/api/projects/[id]/inputs)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns list of project inputs", async () => {
      const mockInputs = [
        {
          id: "inp-1",
          projectId: "prj-1",
          kind: "TEXT",
          originalName: null,
          mimeType: null,
          sizeBytes: 100,
          extraction: "Spec text",
          createdAt: "2026-09-01T00:00:00.000Z",
        },
      ];
      vi.mocked(listInputs).mockResolvedValueOnce(mockInputs as any);

      const req = new Request(
        "http://localhost:3000/api/projects/prj-1/inputs",
      );
      const res = await GET(req, routeContext);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(mockInputs);
    });

    it("handles NotFoundError for unknown project", async () => {
      vi.mocked(listInputs).mockRejectedValueOnce(
        new NotFoundError({ message: "Project not found" }),
      );

      const req = new Request(
        "http://localhost:3000/api/projects/prj-1/inputs",
      );
      const res = await GET(req, routeContext);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toEqual({
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    });
  });

  describe("POST JSON (text input)", () => {
    it("saves text input from JSON body", async () => {
      vi.mocked(saveTextInput).mockResolvedValueOnce({
        id: "inp-text",
        projectId: "prj-1",
        kind: "TEXT",
        originalName: null,
        mimeType: null,
        sizeBytes: 25,
        extraction: "Project requirements text",
        createdAt: "2026-09-01T00:00:00.000Z",
      });

      const req = new Request(
        "http://localhost:3000/api/projects/prj-1/inputs",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: "Project requirements text" }),
        },
      );

      const res = await POST(req, routeContext);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.extraction).toBe("Project requirements text");
    });
  });

  describe("POST multipart via multer (file uploads)", () => {
    it("accepts valid file uploads via multer", async () => {
      vi.mocked(createFileInputs).mockResolvedValueOnce([
        {
          id: "inp-file-1",
          projectId: "prj-1",
          kind: "FILE",
          originalName: "requirements.txt",
          mimeType: "text/plain",
          sizeBytes: 24,
          extraction: "Sample plain text content",
          createdAt: "2026-09-01T00:00:00.000Z",
        },
      ]);

      const formData = new FormData();
      const file = new File(["Sample plain text content"], "requirements.txt", {
        type: "text/plain",
      });
      formData.append("files", file);

      const req = new Request(
        "http://localhost:3000/api/projects/prj-1/inputs",
        {
          method: "POST",
          body: formData,
        },
      );

      const res = await POST(req, routeContext);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toHaveLength(1);
      expect(json[0].id).toBe("inp-file-1");
      expect(createFileInputs).toHaveBeenCalledWith(
        "prj-1",
        expect.arrayContaining([
          expect.objectContaining({ originalName: "requirements.txt" }),
        ]),
        expect.anything(),
      );
    });

    it("rejects file over 10MB with the contract error shape before storage", async () => {
      // Create an oversize buffer (>10MB)
      const oversizeBuffer = new Uint8Array(10 * 1024 * 1024 + 1024);
      const formData = new FormData();
      const file = new File([oversizeBuffer], "huge.pdf", {
        type: "application/pdf",
      });
      formData.append("files", file);

      const req = new Request(
        "http://localhost:3000/api/projects/prj-1/inputs",
        {
          method: "POST",
          body: formData,
        },
      );

      const res = await POST(req, routeContext);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: "Files must be 10MB or smaller",
        },
      });
      expect(createFileInputs).not.toHaveBeenCalled();
    });

    it("rejects non-multipart and non-JSON content type", async () => {
      const req = new Request(
        "http://localhost:3000/api/projects/prj-1/inputs",
        {
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: "plain string",
        },
      );

      const res = await POST(req, routeContext);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("DELETE (/api/projects/[id]/inputs/[inputId])", () => {
    it("deletes input and returns 204", async () => {
      vi.mocked(deleteInput).mockResolvedValueOnce(undefined);

      const req = new Request(
        "http://localhost:3000/api/projects/prj-1/inputs/inp-1",
        { method: "DELETE" },
      );

      const res = await DELETE(req, singleInputRouteContext);
      expect(res.status).toBe(204);
      expect(deleteInput).toHaveBeenCalledWith(
        "prj-1",
        "inp-1",
        expect.anything(),
      );
    });

    it("returns 404 when input is not found", async () => {
      vi.mocked(deleteInput).mockRejectedValueOnce(
        new NotFoundError({ message: "Input not found" }),
      );

      const req = new Request(
        "http://localhost:3000/api/projects/prj-1/inputs/inp-1",
        { method: "DELETE" },
      );

      const res = await DELETE(req, singleInputRouteContext);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toEqual({
        error: { code: "NOT_FOUND", message: "Input not found" },
      });
    });
  });
});
