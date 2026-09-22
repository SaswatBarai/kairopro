import type { DeployInput, DeployResult } from "@kairopro/contracts";
import type { RequestContext } from "../../lib/context";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../lib/errors";
import { findLatestSucceededBuild } from "../build/build.repository";
import {
  findProjectBySubdomain,
  touchProjectActivity,
  updateProject,
} from "../project/project.repository";
import { ownerOf } from "../org/access";
import { getDnsProvider } from "./dns";
import { activateDeployRoute, deployedUrlFor } from "./ssl";

/**
 * Deploy (Phase 19 / BE-11): promotes a project's latest successful build to
 * a persistent, publicly-routed subdomain. "Persistent" is not a container
 * operation — the app container Docker already runs continuously; what
 * changes is `Project.status` becoming `DEPLOYED`, which is the single
 * signal `cleanup-inactive` (platform/jobs/definitions) checks to exempt it
 * from idle cleanup. Getting that check backwards takes a customer's site
 * offline, which is why it lives in exactly one place (see that module's
 * own doc comment) rather than being re-derived here.
 */

const SUBDOMAIN_RE = /^[a-z][a-z0-9-]{1,61}[a-z0-9]$/;

/** Anything that could collide with the platform's own routing — the
 * platform's own hostnames, plus generic infra words a customer could
 * plausibly type. */
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "api",
  "app",
  "admin",
  "preview",
  "status",
  "dashboard",
  "mail",
  "ftp",
  "assets",
  "cdn",
  "static",
  "docs",
  "help",
  "support",
  "blog",
  "staging",
  "kairopro",
]);

export function validateSubdomainFormat(subdomain: string): void {
  if (!SUBDOMAIN_RE.test(subdomain)) {
    throw new ValidationError({
      message:
        "Subdomain must be 3-63 characters, lowercase letters, digits, and hyphens, and cannot start or end with a hyphen.",
      details: { subdomain },
    });
  }
  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    throw new ValidationError({
      message: `"${subdomain}" is reserved and cannot be used as a subdomain.`,
      details: { subdomain },
    });
  }
}

async function requireProjectAccess(projectId: string, ctx: RequestContext) {
  const project = await ownerOf(projectId, ctx);
  if (!project) throw new NotFoundError({ message: "Project not found" });
  return project;
}

/** `Build.previewUrl` is always `http://localhost:<port>` (Phase 14's
 * `DockerRuntime.provision`) — the port Caddy needs to reverse-proxy to. */
function portFromPreviewUrl(previewUrl: string): number {
  const port = Number(new URL(previewUrl).port);
  if (!Number.isInteger(port) || port <= 0) {
    throw new ConflictError({
      message: "The project's latest build has no usable preview port",
      details: { previewUrl },
    });
  }
  return port;
}

export async function deploy(
  projectId: string,
  input: DeployInput,
  ctx: RequestContext,
): Promise<DeployResult> {
  const project = await requireProjectAccess(projectId, ctx);

  const build = await findLatestSucceededBuild(projectId);
  if (!build?.previewUrl) {
    throw new ConflictError({
      message: "This project has no successful build to deploy",
    });
  }

  const subdomain = project.subdomain ?? input.subdomain;
  if (!subdomain) {
    throw new ValidationError({
      message: "A subdomain is required for a project's first deploy",
    });
  }

  if (subdomain !== project.subdomain) {
    validateSubdomainFormat(subdomain);
    const taken = await findProjectBySubdomain(subdomain);
    if (taken && taken.id !== projectId) {
      throw new ConflictError({
        message: `The subdomain "${subdomain}" is already taken`,
        details: { subdomain },
      });
    }
  }

  const targetPort = portFromPreviewUrl(build.previewUrl);

  await getDnsProvider().createRecord(subdomain, "0.0.0.0");
  const deployedUrl = await activateDeployRoute(subdomain, targetPort);

  await updateProject(projectId, {
    subdomain,
    deployedUrl,
    status: "DEPLOYED",
  });
  await touchProjectActivity(projectId);

  return { projectId, subdomain, deployedUrl };
}

export { deployedUrlFor };
