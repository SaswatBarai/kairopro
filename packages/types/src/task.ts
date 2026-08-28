export type TaskStatus =
  | "pending"
  | "planning"
  | "in_progress"
  | "blocked"
  | "testing"
  | "completed"
  | "failed";

export type TaskPriority = "critical" | "high" | "medium" | "low";

export type TaskType =
  | "database"
  | "backend"
  | "frontend"
  | "testing"
  | "deployment"
  | "configuration";

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  taskType: TaskType;
  orderIndex: number;
  agentRunId?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
