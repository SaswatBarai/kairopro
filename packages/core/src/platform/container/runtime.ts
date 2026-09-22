/**
 * ContainerRuntime — where generated code executes. Written in Phase 2,
 * implemented for real (Docker) in Phase 14. Everything downstream (agent
 * exec, build, test run) is written against this interface only, which is
 * what lets those phases run against the stub first.
 */

export interface ProvisionInput {
  projectId: string;
  /** Image the app container runs (e.g. the generated project's build). */
  image: string;
  /** Environment variables for the container — decrypted credentials,
   * injected by the caller, never passed through this interface in plaintext
   * logs. */
  env?: Record<string, string>;
  /** Port the app listens on inside the container. */
  port?: number;
}

export interface ProvisionedContainer {
  containerId: string;
  previewUrl: string;
}

export interface ExecInput {
  containerId: string;
  /** Shell command, run with `sh -lc` inside the container. */
  cmd: string;
  /** Working directory (absolute inside the container). */
  cwd?: string;
  /** Kill the command after this long. */
  timeoutMs?: number;
  env?: Record<string, string>;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface ContainerHealth {
  ready: boolean;
  detail?: string;
}

export interface ManagedContainer {
  containerId: string;
  projectId: string;
}

export interface ContainerRuntime {
  provision(input: ProvisionInput): Promise<ProvisionedContainer>;
  exec(input: ExecInput): Promise<ExecResult>;
  /** Long-running commands: stdout is delivered line by line as it is
   * produced; the result carries the complete output. */
  execStream(
    input: ExecInput,
    onLine: (line: string) => void,
  ): Promise<ExecResult>;
  health(containerId: string): Promise<ContainerHealth>;
  /** Stop the container, preserving volumes. */
  stop(containerId: string): Promise<void>;
  /** Remove the container and its volumes. */
  destroy(containerId: string): Promise<void>;
  /** Every running app container this runtime manages, labeled with the
   * project it belongs to (Phase 19) — `cleanup-inactive` and
   * `cleanup-orphans` sweep this list rather than tracking container ids in
   * the database themselves. */
  list(): Promise<ManagedContainer[]>;
}
