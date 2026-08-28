export type RequirementCategory =
  | "business"
  | "functional"
  | "non_functional"
  | "ui"
  | "security"
  | "data"
  | "integration";

export type RequirementPriority = "critical" | "high" | "medium" | "low";

export type RequirementStatus = "draft" | "clarifying" | "locked" | "approved";

export interface Requirement {
  id: string;
  projectId: string;
  title: string;
  description: string;
  category: RequirementCategory;
  priority: RequirementPriority;
  confidence: number;
  source: string;
  sourceDocumentId?: string | null;
  status: RequirementStatus;
  clarificationQuestion?: string | null;
  clarificationOptions?: Record<string, unknown> | null;
  userAnswer?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
