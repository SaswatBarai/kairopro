import type {
  ProjectListItem,
  ProjectStatus as ContractStatus,
} from "@kairopro/contracts";
import { CheckCircle2, FileText, Rocket, RefreshCw } from "lucide-react";
import type { Project } from "./project-card";
import { BuildingPreview, DraftPreview, LivePreview } from "./project-previews";

const STATUS_MAP: Record<ContractStatus, Project["status"]> = {
  DRAFT: "draft",
  SPECIFYING: "draft",
  BUILDING: "building",
  READY: "ready",
  DEPLOYED: "deployed",
};

const META_BY_STATUS: Record<
  Project["status"],
  { icon: typeof Rocket; iconClass: string }
> = {
  deployed: { icon: Rocket, iconClass: "text-brand-green" },
  ready: { icon: CheckCircle2, iconClass: "text-brand-green" },
  building: { icon: RefreshCw, iconClass: "text-brand-cyan" },
  draft: { icon: FileText, iconClass: "text-zinc-500" },
};

function relativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `Updated ${days}d ago`;
  return `Updated ${Math.round(days / 30)}mo ago`;
}

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** Maps a contract ProjectListItem onto the dashboard card's UI shape. */
export function toUiProject(item: ProjectListItem): Project {
  const status = STATUS_MAP[item.status];
  const meta = META_BY_STATUS[status];
  const rawUrl = item.previewUrl ?? item.deployedUrl;
  const url = rawUrl ? displayUrl(rawUrl) : null;

  return {
    id: item.id,
    name: item.name,
    icon: meta.icon,
    iconClass: meta.iconClass,
    status,
    bucket:
      status === "building"
        ? "building"
        : status === "draft"
          ? "draft"
          : "active",
    preview:
      status === "building" ? (
        <BuildingPreview />
      ) : status === "draft" ? (
        <DraftPreview />
      ) : (
        <LivePreview url={url} />
      ),
    activityValue: relativeTime(item.lastActivityAt),
    url: url ? { display: url, full: url } : undefined,
    href: `/projects/${item.id}`,
    stack: item.stack ?? undefined,
    footerRef: item.latestCommitHash
      ? `main @ ${item.latestCommitHash}`
      : item.status.toLowerCase(),
  };
}
