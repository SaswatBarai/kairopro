import Redis from "ioredis";
import { Queue } from "bullmq";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null, // Required by BullMQ
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// ---------------------------------------------------------------------------
// BullMQ Queues
// ---------------------------------------------------------------------------
const queueConnection = { connection: redis };

export const documentQueue = new Queue("document-processing", queueConnection);
export const aiAnalysisQueue = new Queue("ai-analysis", queueConnection);
export const codeGenQueue = new Queue("code-generation", queueConnection);
export const deploymentQueue = new Queue("deployment", queueConnection);
