import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { ExecutionPanel } from "@/components/marketing/execution-panel";
import { FeatureSection } from "@/components/marketing/feature-section";
import { FeaturesCta } from "@/components/marketing/features-cta";
import { FeaturesHero } from "@/components/marketing/features-hero";
import { IngestPanel } from "@/components/marketing/ingest-panel";
import { OwnershipPanel } from "@/components/marketing/ownership-panel";
import { QualityPanel } from "@/components/marketing/quality-panel";
import { StagingPanel } from "@/components/marketing/staging-panel";
import { SystemBar } from "@/components/marketing/system-bar";
import { VerificationPanel } from "@/components/marketing/verification-panel";

export function FeaturesPage() {
  return (
    <>
      <Navbar />
      <main className="grid-lines-bg relative w-full overflow-hidden pt-[92px]">
        <SystemBar />
        <FeaturesHero />
        <div className="flex w-full flex-col divide-y divide-white/[0.06]">
          <FeatureSection
            id="ingestion"
            phase="01"
            name="Ingestion"
            tagline="Bring your requirements"
            title="Raw documentation parsed into strict system topology."
            description="Feed raw product requirements in whatever format you already have. KairoPro parses specifications, Figma tokens, user stories, and Jira exports into deterministic state schemas and relational data structures without hallucinating missing business logic."
            tagsLabel="Engine dependencies"
            tags={[
              "markdown-it",
              "AST parser",
              "OpenAPI 3.1",
              "Figma REST API",
              "JSON Schema",
            ]}
            accent="purple"
            panel={<IngestPanel />}
          />
          <FeatureSection
            id="verification"
            phase="02"
            name="Verification"
            tagline="Approve three artifacts"
            title="Architectural control before a single file compiles."
            description="You stay in complete architectural control before a single line of code is written. Review and approve three structured artifacts: the synthesized PRD, the Prisma data model with relational foreign keys, and the complete route and component tree."
            tagsLabel="Gate specs"
            tags={[
              "prisma/schema.prisma",
              "ERD generation",
              "Next.js App Router topology",
              "RBAC matrix",
            ]}
            accent="purple"
            reversed
            panel={<VerificationPanel />}
          />
          <FeatureSection
            id="execution"
            phase="03"
            name="Execution"
            tagline="Watch it build"
            title="Autonomous sandboxes compiling with sub-second feedback."
            description="Observe the autonomous compiler in real-time. The agent spins up isolated sandboxes, executes builds, writes scaffolding, captures compiler errors, and writes automated tests with sub-second feedback loops."
            tagsLabel="Runtime stack"
            tags={[
              "Next.js 14.2",
              "Tailwind CSS v4",
              "TypeScript 5.4",
              "Docker container runner",
              "Node 20.x",
            ]}
            accent="cyan"
            panel={<ExecutionPanel />}
          />
          <FeatureSection
            id="quality"
            phase="04"
            name="Quality assurance"
            tagline="It tests itself"
            title="Automated testing with self-healing code loops."
            description="KairoPro doesn't hand over unverified boilerplate. Every generated endpoint, auth flow, and database transaction runs against automated test suites. If an integration test fails, the self-healing AST loop patches the code and re-runs until 100% pass rate is achieved."
            tagsLabel="Test instrumentation"
            tags={[
              "Vitest",
              "Playwright E2E",
              "Supertest API assertions",
              "Self-healing AST patcher",
            ]}
            accent="green"
            reversed
            panel={<QualityPanel />}
          />
          <FeatureSection
            id="staging"
            phase="05"
            name="Staging"
            tagline="Preview and deploy"
            title="Ephemeral staging environments with live database branches."
            description="Every build yields an instant, fully functional preview environment with ephemeral PostgreSQL database branches and mock authentication ready for interactive staging tests and team review."
            tagsLabel="Infrastructure specs"
            tags={[
              "Vercel Edge Runtime",
              "Neon Serverless Postgres",
              "SSL / TLS auto-provisioning",
              "Ephemeral preview URLs",
            ]}
            accent="purple"
            panel={<StagingPanel />}
          />
          <FeatureSection
            id="ownership"
            phase="06"
            name="Ownership"
            tagline="Take the code with you"
            title="Zero vendor lock-in. Real code in your own repository."
            description="Zero vendor lock-in. Export clean, human-readable TypeScript and Tailwind code straight to your GitHub account with pristine commit history, conventional commit messages, and turnkey CI/CD workflows."
            tagsLabel="Export toolchain"
            tags={[
              "GitHub REST API",
              "Conventional Commits",
              "ESLint strict",
              "Biome",
              "Zero proprietary runtime",
            ]}
            accent="purple"
            reversed
            panel={<OwnershipPanel />}
          />
        </div>
        <FeaturesCta />
      </main>
      <Footer />
    </>
  );
}
