import { redirect } from "next/navigation";

/** The old result page. The result is now the same screen as the build. */
export default async function LegacyBuildCompleteRoute({
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
