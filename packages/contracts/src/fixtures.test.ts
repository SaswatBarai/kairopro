import { describe, expect, it } from "vitest";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_INPUT_FILES_PER_PROJECT,
  MAX_UPLOAD_BYTES,
  SERVICE_REGISTRY,
  AnswerPmQuestionsInputSchema,
  BuildLogSchema,
  BuildSchema,
  BuildStreamEventSchema,
  CredentialServiceSchema,
  CreateProjectInputSchema,
  ErrorBodySchema,
  InputSchema,
  LoginInputSchema,
  PmQuestionSchema,
  PmQuestionsSchema,
  ReviseSpecInputSchema,
  ProjectListItemSchema,
  ProjectSchema,
  PutCredentialInputSchema,
  RegisterInputSchema,
  ServiceCredentialsListSchema,
  SessionUserSchema,
  SpecSchema,
  UsageEventSchema,
  UsageTotalsSchema,
  VersionSchema,
} from "./index";

/**
 * Fixtures mirror the demo identity the shipped pages display: Ada Lovelace
 * (ada@lovelace.dev) in the kairo-core org, TaskFlow deployed at
 * taskflow.kairopro.app with main at 7e2f1a.
 */

const taskflow = {
  id: "prj_taskflow",
  orgId: "org_kairo_core",
  name: "TaskFlow",
  description: "A team task manager with boards and assignments",
  status: "DEPLOYED",
  templateId: "nextjs-shadcn",
  previewUrl: null,
  deployedUrl: "https://taskflow.kairopro.app",
  createdAt: "2026-09-01T09:12:00Z",
  updatedAt: "2026-09-12T16:40:00Z",
};

const taskflowListItem = {
  ...taskflow,
  stack: "Next.js · shadcn/ui",
  latestCommitHash: "7e2f1a",
  lastActivityAt: "2026-09-12T16:40:00Z",
};

const taskflowSpec = {
  id: "spec_taskflow_prd",
  projectId: "prj_taskflow",
  type: "PRD",
  version: 3,
  status: "APPROVED",
  content: {
    overview: "Team task management with boards, assignees, and due dates",
    personas: ["Team lead", "Contributor"],
  },
  createdAt: "2026-09-02T11:05:00Z",
};

const pmQuestions = [
  {
    id: "q1",
    question: "Who signs up first?",
    options: ["Teams", "Individuals"],
  },
  {
    id: "q2",
    question: "How are tasks organized?",
    options: ["Boards", "Lists", "Calendar"],
  },
  {
    id: "q3",
    question: "What is tracked per task?",
    options: ["Assignee", "Due date", "Labels", "Attachments"],
  },
];

const taskflowBuild = {
  id: "bld_taskflow_7",
  projectId: "prj_taskflow",
  status: "SUCCEEDED",
  startedAt: "2026-09-12T15:02:00Z",
  finishedAt: "2026-09-12T15:31:00Z",
  commitHash: "7e2f1a3b9c4d",
  previewUrl: "https://taskflow-7e2f1a.preview.kairopro.app",
  createdAt: "2026-09-12T15:01:00Z",
};

const buildLog = {
  id: "log_0042",
  buildId: "bld_taskflow_7",
  seq: 42,
  type: "STDOUT",
  content: "✓ Compiled successfully in 89s",
  createdAt: "2026-09-12T15:20:11Z",
};

const streamEvent = {
  seq: 43,
  event: "checkpoint",
  data: { hash: "7e2f1a3b9c4d", message: "Dependencies installed" },
};

const prdUpload = {
  id: "inp_taskflow_prd",
  projectId: "prj_taskflow",
  kind: "FILE",
  originalName: "taskflow-prd.pdf",
  mimeType: "application/pdf",
  sizeBytes: 184320,
  extraction: "Team task management with boards, assignees, and due dates…",
  createdAt: "2026-09-01T09:30:00Z",
};

const textInput = {
  id: "inp_taskflow_text",
  projectId: "prj_taskflow",
  kind: "TEXT",
  originalName: null,
  mimeType: null,
  sizeBytes: 96,
  extraction: "A task manager where teams organize work on boards",
  createdAt: "2026-09-01T09:14:00Z",
};

const serviceCredentials = [
  {
    service: "google_oauth",
    status: "CONNECTED",
    fields: [
      {
        key: "clientId",
        label: "Client ID",
        maskedValue: "••••eusercontent.com",
      },
      { key: "clientSecret", label: "Client Secret", maskedValue: "••••8f2a" },
    ],
  },
  {
    service: "stripe",
    status: "CONNECTED",
    fields: [
      { key: "secretKey", label: "Secret Key", maskedValue: "••••9f2c" },
    ],
  },
  { service: "sendgrid", status: "UNCONFIGURED", fields: [] },
  { service: "aws_s3", status: "UNUSED", fields: [] },
];

const taskflowVersion = {
  id: "ver_taskflow_12",
  projectId: "prj_taskflow",
  hash: "7e2f1a3b9c4d5e6f",
  message: "feat: drag-to-reorder and task filters",
  filesChanged: 6,
  revertible: true,
  createdAt: "2026-09-12T16:38:00Z",
};

const usageEvent = {
  id: "use_0001",
  orgId: "org_kairo_core",
  projectId: "prj_taskflow",
  kind: "LLM_TOKENS",
  quantity: 12400,
  createdAt: "2026-09-12T15:05:00Z",
};

const sessionUser = {
  id: "usr_ada",
  name: "Ada Lovelace",
  email: "ada@lovelace.dev",
  orgId: "org_kairo_core",
  orgName: "kairo-core",
};

describe("fixtures parse", () => {
  it("parses the demo project and list item", () => {
    expect(ProjectSchema.parse(taskflow)).toEqual(taskflow);
    expect(ProjectListItemSchema.parse(taskflowListItem)).toEqual(
      taskflowListItem,
    );
    expect(CreateProjectInputSchema.parse({ name: "TaskFlow" })).toEqual({
      name: "TaskFlow",
    });
  });

  it("parses the demo spec and PM questions", () => {
    expect(SpecSchema.parse(taskflowSpec)).toEqual(taskflowSpec);
    expect(PmQuestionsSchema.parse(pmQuestions)).toEqual(pmQuestions);
    expect(
      AnswerPmQuestionsInputSchema.parse({ answers: { q1: "Teams" } }),
    ).toEqual({ answers: { q1: "Teams" } });
    expect(
      ReviseSpecInputSchema.parse({ content: taskflowSpec.content }),
    ).toEqual({ content: taskflowSpec.content });
  });

  it("parses the demo build, log, and stream event", () => {
    expect(BuildSchema.parse(taskflowBuild)).toEqual(taskflowBuild);
    expect(BuildLogSchema.parse(buildLog)).toEqual(buildLog);
    expect(BuildStreamEventSchema.parse(streamEvent)).toEqual(streamEvent);
  });

  it("parses the demo inputs (file and text)", () => {
    expect(InputSchema.parse(prdUpload)).toEqual(prdUpload);
    expect(InputSchema.parse(textInput)).toEqual(textInput);
  });

  it("parses the demo credential list and put input", () => {
    expect(ServiceCredentialsListSchema.parse(serviceCredentials)).toEqual(
      serviceCredentials,
    );
    expect(
      PutCredentialInputSchema.parse({
        service: "stripe",
        values: { secretKey: "sk_live_51M8kairoPro2vXq99f2c" },
      }),
    ).toEqual({
      service: "stripe",
      values: { secretKey: "sk_live_51M8kairoPro2vXq99f2c" },
    });
  });

  it("parses the demo version, usage, session, and error body", () => {
    expect(VersionSchema.parse(taskflowVersion)).toEqual(taskflowVersion);
    expect(UsageEventSchema.parse(usageEvent)).toEqual(usageEvent);
    expect(
      UsageTotalsSchema.parse({
        llmTokens: 12400,
        builds: 7,
        containerMinutes: 213,
      }),
    ).toEqual({
      llmTokens: 12400,
      builds: 7,
      containerMinutes: 213,
    });
    expect(SessionUserSchema.parse(sessionUser)).toEqual(sessionUser);
    expect(
      ErrorBodySchema.parse({
        error: { code: "NOT_FOUND", message: "Project not found" },
      }),
    ).toEqual({ error: { code: "NOT_FOUND", message: "Project not found" } });
    expect(
      RegisterInputSchema.parse({
        name: "Ada Lovelace",
        email: "ada@lovelace.dev",
        password: "analytical-engine",
      }),
    ).toBeTruthy();
    expect(
      LoginInputSchema.parse({
        email: "ada@lovelace.dev",
        password: "analytical-engine",
      }),
    ).toBeTruthy();
  });
});

describe("invalid fixtures are rejected", () => {
  it("rejects an unknown project status and a non-URL", () => {
    expect(
      ProjectSchema.safeParse({ ...taskflow, status: "ARCHIVED" }).success,
    ).toBe(false);
    expect(
      ProjectSchema.safeParse({
        ...taskflow,
        deployedUrl: "taskflow.kairopro.app",
      }).success,
    ).toBe(false);
  });

  it("rejects bad registrations", () => {
    const base = { name: "Ada Lovelace", password: "analytical-engine" };
    expect(
      RegisterInputSchema.safeParse({ ...base, email: "lovelace.dev" }).success,
    ).toBe(false);
    expect(
      RegisterInputSchema.safeParse({
        ...base,
        email: "ada@lovelace.dev",
        password: "short",
      }).success,
    ).toBe(false);
  });

  it("rejects out-of-bounds PM questions", () => {
    expect(PmQuestionsSchema.safeParse(pmQuestions.slice(0, 2)).success).toBe(
      false,
    );
    expect(
      PmQuestionSchema.safeParse({
        id: "q4",
        question: "Too many options?",
        options: ["a", "b", "c", "d", "e"],
      }).success,
    ).toBe(false);
  });

  it("rejects a disallowed mime type and an oversized upload", () => {
    expect(
      InputSchema.safeParse({ ...prdUpload, mimeType: "video/mp4" }).success,
    ).toBe(false);
    expect(
      InputSchema.safeParse({ ...prdUpload, sizeBytes: MAX_UPLOAD_BYTES + 1 })
        .success,
    ).toBe(false);
  });

  it("rejects a negative log seq, an empty credential put, and an unknown service", () => {
    expect(BuildLogSchema.safeParse({ ...buildLog, seq: -1 }).success).toBe(
      false,
    );
    expect(
      PutCredentialInputSchema.safeParse({ service: "stripe", values: {} })
        .success,
    ).toBe(false);
    expect(
      PutCredentialInputSchema.safeParse({
        service: "twilio",
        values: { token: "x" },
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown error code and a bad session email", () => {
    expect(
      ErrorBodySchema.safeParse({
        error: { code: "SOMETHING_ELSE", message: "…" },
      }).success,
    ).toBe(false);
    expect(
      SessionUserSchema.safeParse({ ...sessionUser, email: "lovelace.dev" })
        .success,
    ).toBe(false);
  });
});

describe("the service registry is complete", () => {
  it("has exactly one entry per credential service", () => {
    for (const service of CredentialServiceSchema.options) {
      const entries = SERVICE_REGISTRY.filter((s) => s.id === service);
      expect(entries, service).toHaveLength(1);
    }
    expect(SERVICE_REGISTRY).toHaveLength(
      CredentialServiceSchema.options.length,
    );
  });

  it("declares at least one secret field and unique keys per service", () => {
    for (const service of SERVICE_REGISTRY) {
      expect(
        service.fields.some((f) => f.secret),
        service.id,
      ).toBe(true);
      const keys = service.fields.map((f) => f.key);
      expect(new Set(keys).size, service.id).toBe(keys.length);
      const envKeys = service.fields.map((f) => f.envKey);
      expect(new Set(envKeys).size, service.id).toBe(envKeys.length);
    }
  });

  it("shares the upload constraints the frontend enforces", () => {
    expect(MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_INPUT_FILES_PER_PROJECT).toBe(5);
    expect(ALLOWED_UPLOAD_MIME_TYPES).toContain("application/pdf");
    expect(ALLOWED_UPLOAD_MIME_TYPES).not.toContain("video/mp4");
  });
});
