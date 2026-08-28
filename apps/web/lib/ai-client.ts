/**
 * Internal HTTP client for calling the FastAPI AI engine.
 *
 * Security: all requests include X-Service-Token header.
 * The browser NEVER calls FastAPI directly — only this server-side client does.
 */

const AI_BASE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
const AI_SERVICE_TOKEN = process.env.AI_SERVICE_TOKEN ?? "dev-internal-token";

class AIServiceError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}

async function callAI<T = unknown>(
  path: string,
  body?: unknown,
  method: "GET" | "POST" | "DELETE" = "POST"
): Promise<T> {
  const res = await fetch(`${AI_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Service-Token": AI_SERVICE_TOKEN,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new AIServiceError(res.status, `AI service ${path} failed: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Exported AI API methods
// ---------------------------------------------------------------------------

export async function analyzeRequirements(payload: {
  projectId: string;
  runId: string;
  problemStatement: string;
}) {
  return callAI("/ai/analyze", payload);
}

export async function generatePRD(payload: {
  projectId: string;
  runId: string;
}) {
  return callAI("/ai/prd", payload);
}

export async function generateDesign(payload: {
  projectId: string;
  runId: string;
}) {
  return callAI("/ai/design", payload);
}

export async function generateArchitecture(payload: {
  projectId: string;
  runId: string;
}) {
  return callAI("/ai/architecture", payload);
}

export async function generateCode(payload: {
  projectId: string;
  runId: string;
  taskId: string;
}) {
  return callAI("/ai/code", payload);
}

export async function processDocument(payload: {
  documentId: string;
  projectId: string;
}) {
  return callAI("/ai/documents/process", payload);
}

export async function searchKnowledge(payload: {
  projectId: string;
  query: string;
  limit?: number;
}) {
  return callAI("/ai/search", payload);
}

export async function checkAIHealth(): Promise<{ status: string }> {
  return callAI("/health", undefined, "GET");
}
