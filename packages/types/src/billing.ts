export interface SubscriptionPlan {
  id: string;
  name: string;
  priceCents: number;
  aiCredits: number;
  buildMinutes: number;
  storageMb: number;
  maxProjects: number;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
}
