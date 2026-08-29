import { Queue, RedisOptions } from "bullmq";
import Redis from "ioredis";

// Configure Redis connection
const redisOptions: RedisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  maxRetriesPerRequest: null,
};

// Re-use connection
export const redis = new Redis(redisOptions);

// Initialize document processing queue
export const documentQueue = new Queue("document-processing", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: true,
  },
});

export const aiAnalysisQueue = new Queue("ai-analysis", {
  connection: redis,
  defaultJobOptions: {
    attempts: 1, // Let user retry manually instead of background backoff
    removeOnComplete: true,
  },
});
