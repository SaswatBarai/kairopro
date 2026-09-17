// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import {
  deleteInputRequest,
  fetchInputs,
  saveTextInputRequest,
  uploadFilesRequest,
  useDeleteInputMutation,
  useInputsQuery,
  useSaveTextInputMutation,
  useUploadFilesMutation,
} from "./inputs";

const mockInputs = [
  {
    id: "inp-1",
    projectId: "prj-test",
    kind: "TEXT",
    originalName: null,
    mimeType: null,
    sizeBytes: 40,
    extraction: "Requirements description",
    createdAt: "2026-09-01T00:00:00.000Z",
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function wrapperWithClient(client: QueryClient) {
  return function ProviderWrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe("Frontend Client ↔ Inputs API Integration (React Query Hooks & API Requests)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("API fetch requests", () => {
    it("fetchInputs retrieves inputs for a project", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockInputs), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const inputs = await fetchInputs("prj-test");
      expect(inputs).toEqual(mockInputs);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/projects/prj-test/inputs",
        undefined,
      );
    });

    it("fetchInputs throws user-facing error message on 404", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { code: "NOT_FOUND", message: "Project not found" },
          }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        ),
      );

      await expect(fetchInputs("prj-missing")).rejects.toThrow(
        "Project not found",
      );
    });

    it("saveTextInputRequest posts text requirements as JSON and receives created record", async () => {
      const created = {
        id: "inp-text-created",
        projectId: "prj-test",
        kind: "TEXT",
        originalName: null,
        mimeType: null,
        sizeBytes: 30,
        extraction: "Build a project dashboard",
        createdAt: "2026-09-01T00:00:00.000Z",
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(created), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await saveTextInputRequest(
        "prj-test",
        "Build a project dashboard",
      );
      expect(result).toEqual(created);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/projects/prj-test/inputs",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "TEXT",
            text: "Build a project dashboard",
          }),
        }),
      );
    });

    it("uploadFilesRequest posts multipart files and receives created records", async () => {
      const createdList = [
        {
          id: "inp-file-1",
          projectId: "prj-test",
          kind: "FILE",
          originalName: "spec.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1000,
          extraction: "Extracted specs",
          createdAt: "2026-09-01T00:00:00.000Z",
        },
      ];

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(createdList), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const file = new File(["specification content"], "spec.pdf", {
        type: "application/pdf",
      });
      const results = await uploadFilesRequest("prj-test", [file]);
      expect(results).toEqual(createdList);

      const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0]!;
      expect(fetchCall[0]).toBe("/api/projects/prj-test/inputs");
      expect(fetchCall[1]?.method).toBe("POST");
      expect(fetchCall[1]?.body).toBeInstanceOf(FormData);
    });

    it("uploadFilesRequest surfaces 400 validation error from the API", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: "VALIDATION_ERROR",
              message: "Files must be 10MB or smaller",
            },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      );

      const hugeFile = new File(["x"], "huge.pdf", { type: "application/pdf" });
      await expect(uploadFilesRequest("prj-test", [hugeFile])).rejects.toThrow(
        "Files must be 10MB or smaller",
      );
    });

    it("deleteInputRequest sends DELETE and handles 204", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 204 }),
      );

      await expect(
        deleteInputRequest("prj-test", "inp-1"),
      ).resolves.toBeUndefined();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/projects/prj-test/inputs/inp-1",
        { method: "DELETE" },
      );
    });
  });

  describe("React Query Hooks integration", () => {
    it("useInputsQuery fetches and caches inputs", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockInputs), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const client = createTestQueryClient();
      const { result } = renderHook(() => useInputsQuery("prj-test"), {
        wrapper: wrapperWithClient(client),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockInputs);
    });

    it("useSaveTextInputMutation mutates text and invalidates query cache", async () => {
      const created = { ...mockInputs[0]!, extraction: "New text" };
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(created), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const client = createTestQueryClient();
      const invalidateSpy = vi.spyOn(client, "invalidateQueries");

      const { result } = renderHook(
        () => useSaveTextInputMutation("prj-test"),
        { wrapper: wrapperWithClient(client) },
      );

      result.current.mutate("New text");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.extraction).toBe("New text");
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["projects", "prj-test", "inputs"],
      });
    });

    it("useUploadFilesMutation uploads files and invalidates query cache", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockInputs), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const client = createTestQueryClient();
      const invalidateSpy = vi.spyOn(client, "invalidateQueries");

      const { result } = renderHook(() => useUploadFilesMutation("prj-test"), {
        wrapper: wrapperWithClient(client),
      });

      const file = new File(["doc content"], "notes.txt", {
        type: "text/plain",
      });
      result.current.mutate([file]);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["projects", "prj-test", "inputs"],
      });
    });

    it("useDeleteInputMutation deletes input and invalidates cache", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 204 }),
      );

      const client = createTestQueryClient();
      const invalidateSpy = vi.spyOn(client, "invalidateQueries");

      const { result } = renderHook(() => useDeleteInputMutation("prj-test"), {
        wrapper: wrapperWithClient(client),
      });

      result.current.mutate("inp-1");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["projects", "prj-test", "inputs"],
      });
    });
  });
});
