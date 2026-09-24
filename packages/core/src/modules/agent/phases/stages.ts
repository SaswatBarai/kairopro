/**
 * Coarse progress markers inside a build's `generate` step, so a client can
 * show more than "generating" for the several minutes it takes. They are
 * real boundaries in the code, never estimates: `scaffold` copies the
 * template, `schema` writes the data model and migrates it, `auth` writes
 * the auth config (before the routes that import it), `api` freezes
 * contracts then writes each route, `pages` writes each page.
 */
export type GenerateStage = "scaffold" | "schema" | "api" | "pages" | "auth";

export type OnStage = (
  stage: GenerateStage,
  status: "started" | "completed",
) => void;
