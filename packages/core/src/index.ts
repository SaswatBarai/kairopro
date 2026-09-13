/**
 * @kairopro/core
 *
 * Domain modules and platform seams. Server-only.
 *
 * This package deliberately has NO `next` dependency. That is the structural
 * enforcement of the boundary rule: importing `next/headers` or any other
 * framework module from here fails to resolve rather than relying on review
 * or an ESLint rule that can be disabled.
 *
 * The web app reads the session and passes a RequestContext in.
 *
 * Populated across Phase 1 … Phase 20 (legacy BE-1 … BE-11, AI-1 … AI-9).
 */

export { db } from "./platform/db/client";
export type { PrismaClient } from "@kairopro/db";

// Typed errors — every module throws these; routes map them (Phase 3+).
export * from "./lib/errors";

// Platform seams. Consumers import the interface or the selector — never an
// implementation directly (tests and the selectors themselves excepted).
export { eventBus } from "./platform/events";
export type {
  EventBus,
  BuildChannel,
  BuildEvent,
  BusChannels,
  EventHandler,
  Unsubscribe,
} from "./platform/events";

export { getWorkspaceStore } from "./platform/workspace";
export type { WorkspaceStore } from "./platform/workspace";

export { getContainerRuntime } from "./platform/container";
export type {
  ContainerRuntime,
  ContainerHealth,
  ExecInput,
  ExecResult,
  ProvisionInput,
  ProvisionedContainer,
} from "./platform/container";

export {
  ENCRYPTION_KEY_ENV,
  decryptField,
  encryptField,
  generateEncryptionKey,
  getEncryptionKey,
  loadEncryptionKey,
} from "./platform/crypto/encryption";
export type { EncryptedRecord } from "./platform/crypto/encryption";

export { createLogger, logger, withCorrelation } from "./platform/logger";
export type {
  CorrelationFields,
  CreateLoggerOptions,
  Logger,
} from "./platform/logger";

export { scheduler } from "./platform/jobs/scheduler";
export type { Scheduler } from "./platform/jobs/scheduler";

// Phase 3 Auth & Org exports
export type { RequestContext } from "./lib/context";
export { hashPassword, verifyPassword } from "./platform/crypto/password";
export {
  createPersonalOrg,
  getPrimaryOrgForUser,
} from "./modules/org/org.service";
export {
  createMembership,
  findMembership,
  listUserMemberships,
} from "./modules/org/membership.repository";
export { assertMember, canEdit, ownerOf } from "./modules/org/access";

// Phase 4 Project & Usage exports
export { commitAll, headCommit, initRepo } from "./modules/version/git.service";
export { createWorkspace, destroyWorkspace } from "./modules/project/workspace";
export {
  createProject as createProjectRecord,
  deleteProject as deleteProjectRecord,
  findProjectById,
  findProjectWithActivity,
  listProjectsByOrg,
  updateProject as updateProjectRecord,
} from "./modules/project/project.repository";
export {
  LEGAL_TRANSITIONS,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  transitionStatus,
  updateProject,
} from "./modules/project/project.service";
export { emit } from "./modules/usage/usage.service";
export { listUsageByOrg, recordUsage } from "./modules/usage/usage.repository";
