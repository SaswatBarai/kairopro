import { z } from "zod";

/**
 * App structure content schema (Phase 11 / AI-5) — shared with BE-6.
 * `requestType`/`responseType` are required, non-empty strings, not
 * optional: that's the whole enforcement of "every endpoint has both a
 * request and a response type" — a model that omits one fails schema
 * validation and retries, rather than producing an incomplete spec.
 */

export const AppStructurePageSchema = z.object({
  route: z.string().min(1),
  personas: z.array(z.string().min(1)).min(1),
});

export const HttpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

export const AppStructureEndpointSchema = z.object({
  method: HttpMethodSchema,
  path: z.string().min(1),
  requestType: z.string().min(1),
  responseType: z.string().min(1),
});

export const AppStructureComponentSchema = z.object({
  name: z.string().min(1),
  responsibility: z.string().min(1),
});

export const AppStructureContentSchema = z.object({
  pages: z.array(AppStructurePageSchema).min(1),
  endpoints: z.array(AppStructureEndpointSchema).min(1),
  components: z.array(AppStructureComponentSchema).min(1),
});

export type AppStructurePage = z.infer<typeof AppStructurePageSchema>;
export type HttpMethod = z.infer<typeof HttpMethodSchema>;
export type AppStructureEndpoint = z.infer<typeof AppStructureEndpointSchema>;
export type AppStructureComponent = z.infer<typeof AppStructureComponentSchema>;
export type AppStructureContent = z.infer<typeof AppStructureContentSchema>;
