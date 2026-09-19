/**
 * Per-spec-type content validators (Phase 11 / AI-5), shared with BE-6. A
 * generated spec is validated against its schema before it is ever
 * returned or written — `spec.service.ts` only requires "is a JSON object"
 * at its own layer; this is where the real per-type shape is enforced.
 *
 * `pm-questions` isn't one of the four `SpecType`s (it never becomes a
 * `Spec` row), so it has no validator here — it's already fully specified
 * by `@kairopro/contracts`' `PmQuestionsSchema`.
 */
export * from "./prd";
export * from "./design";
export * from "./data-model";
export * from "./app-structure";
