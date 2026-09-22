/**
 * @kairopro/contracts
 *
 * Zod schemas and inferred types shared by the frontend, the backend routes,
 * and the agent. Isomorphic: no Node built-ins, no server-only code, no
 * internal dependencies beyond zod.
 *
 * Written in Phase 0 (P0.4) against the shapes the shipped pages display.
 */
export * from "./error";
export * from "./auth";
export * from "./project";
export * from "./spec";
export * from "./build";
export * from "./input";
export * from "./upload";
export * from "./credential";
export * from "./version";
export * from "./usage";
export * from "./deploy";
export * from "./change";
