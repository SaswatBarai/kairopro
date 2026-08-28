export interface PRDFeature {
  id: string;
  title: string;
  userStory: string;
  acceptanceCriteria: string[];
  priority: "high" | "medium" | "low";
  dependencies?: string[];
}

export interface PRDContent {
  title: string;
  overview: {
    problem: string;
    targetAudience: string;
    goals: string[];
  };
  features: PRDFeature[];
  nonFunctionalRequirements: string[];
  securityRequirements: string[];
}

export interface PRDVersion {
  id: string;
  projectId: string;
  version: number;
  content: PRDContent;
  contentMarkdown: string;
  generatedBy: "ai" | "user";
  changeSummary?: string | null;
  parentVersionId?: string | null;
  createdAt: Date;
}
