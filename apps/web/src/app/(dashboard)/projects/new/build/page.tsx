import { redirect } from "next/navigation";

/**
 * The build view used to live here, keyed by `?projectId=`. It now lives at
 * `/projects/[id]/build`. Without this, the old URL — still in bookmarks and
 * in each browser's saved "last setup step" — would match that route with
 * `id = "new"` and load a project that doesn't exist.
 */
export default async function LegacyBuildRoute({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; buildId?: string }>;
}) {
  const { projectId, buildId } = await searchParams;
  if (!projectId) redirect("/dashboard");
  redirect(
    `/projects/${encodeURIComponent(projectId)}/build${
      buildId ? `?buildId=${encodeURIComponent(buildId)}` : ""
    }`,
  );
}
