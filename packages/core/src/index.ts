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

// Phase 5 Input exports
export {
  createFileInputs,
  deleteInput,
  listInputs,
  purgeProjectUploads,
  saveTextInput,
  toInput,
  type IncomingUpload,
} from "./modules/input/input.service";
export {
  countFileInputs,
  createInput as createInputRecord,
  deleteInputRow,
  deleteInputsByStoredNames,
  findInputById,
  findTextInput,
  listInputsByProject,
  updateInput as updateInputRecord,
} from "./modules/input/input.repository";
export {
  createObjectStorage,
  generateStoredName,
  getObjectStorage,
  sanitizeOriginalName,
  type ObjectStorage,
} from "./modules/input/storage";
export { sniffMime } from "./modules/input/sniff";
export { extractByMime } from "./modules/input/extract";

// Phase 6 Spec exports
export {
  approveSpec,
  createSpec,
  getSpec,
  listSpecs,
  rejectSpec,
  reviseSpec,
} from "./modules/spec/spec.service";
export {
  createSpecVersion,
  findApprovedSpecsByTypes,
  findLatestSpecByType,
  findLatestSpecsByProject,
  findSpecById,
  findSpecWithProject,
  updateSpecStatus,
} from "./modules/spec/spec.repository";
export { createNextVersion } from "./modules/spec/versioning";
export {
  SPEC_ORDER,
  downstreamTypes,
  staleDownstream,
} from "./modules/spec/staleness";
export {
  StubSpecGenerator,
  getSpecGenerator,
  type SpecGenerator,
} from "./modules/spec/generator";
export {
  exportDesignDocument,
  lintDesignDocument,
  parseDesignDocument,
  serializeDesignDocument,
  type DesignDocument,
  type ExportFormat,
  type LintFinding,
  type LintResult,
} from "./modules/design/design.service";

// Phase 7 LLM provider exports (AI-1)
export { getLLMProvider } from "./modules/agent/llm";
export type {
  LLMCompleteInput,
  LLMCompleteResult,
  LLMMessage,
  LLMProvider,
  LLMRole,
  LLMStopReason,
  LLMStreamEvent,
  LLMUsage,
} from "./modules/agent/llm/provider";
export { MockProvider } from "./modules/agent/llm/providers/mock";
export { createTogetherProvider } from "./modules/agent/llm/providers/together";
export {
  WORKFLOW_PHASES,
  modelFor,
  type WorkflowPhase,
} from "./modules/agent/llm/router";
export {
  completeStructured,
  type CompleteStructuredInput,
} from "./modules/agent/llm/structured";
export { recordCallUsage } from "./modules/agent/llm/tokens";
export { estimateTokens } from "./modules/agent/llm/token-estimate";
export {
  LLMProviderError,
  LLMStructuredOutputError,
  LLMTimeoutError,
} from "./modules/agent/llm/errors";

// Phase 8 Prompt infrastructure exports (AI-3)
export {
  clearPromptCache,
  loadPrompt,
  renderPrompt,
  type PromptName,
} from "./modules/agent/prompts/loader";

// Phase 9 Tool registry exports (AI-2)
export {
  createDefaultToolRegistry,
  defaultToolRegistry,
  ToolRegistry,
  type Tool,
  type ToolResult,
  type ToolCallEvent,
  type ToolContext,
} from "./modules/agent/tools";
export {
  deleteFileTool,
  editFileTool,
  listFilesTool,
  readFileTool,
  writeFileTool,
} from "./modules/agent/tools/file.tools";
export {
  findSymbolTool,
  searchCodeTool,
} from "./modules/agent/tools/search.tools";
export { runCommandTool } from "./modules/agent/tools/exec.tools";
export {
  assertCommandAllowed,
  confinePath,
  truncateOutput,
  DEFAULT_COMMAND_TIMEOUT_MS,
  MAX_COMMAND_TIMEOUT_MS,
} from "./modules/agent/tools/safety";

// Phase 10 Context builder exports (AI-4)
export {
  retrieve,
  type RetrieveRequest,
  type RetrieveProject,
  type RetrieveOptions,
  type RetrieveResult,
  type RetrievedFile,
  type RetrievalReason,
} from "./modules/agent/context/retrieve";
export {
  buildFileIndex,
  type FileIndex,
  type FileIndexEntry,
} from "./modules/agent/context/file-index";
export {
  buildDependencyGraph,
  type DependencyGraph,
} from "./modules/agent/context/dependency-graph";
export {
  summarize,
  renderSummary,
  type ProjectSummary,
} from "./modules/agent/context/summary";
export {
  applyBudget,
  type BudgetCandidate,
  type BudgetResult,
} from "./modules/agent/context/budget";
export { hydrate, type HydratedFile } from "./modules/agent/context/hydrate";
