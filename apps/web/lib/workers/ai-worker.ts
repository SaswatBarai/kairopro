import { Worker } from "bullmq";
import { redis } from "../queue";
import { callAI } from "../ai-client";
import { logger } from "../logger";

export const aiWorker = new Worker(
  "ai-analysis",
  async (job) => {
    const { projectId, runId, agentType, input } = job.data;
    logger.info(`Starting AI Analysis (${agentType}) for project ${projectId} run ${runId}`);

    try {
      if (agentType === "requirement") {
        await callAI("/ai/analyze", { projectId, runId, input });
      } else if (agentType === "prd") {
        await callAI("/ai/generate", { projectId, runId, requirements: input.requirements });
      } else if (agentType === "design") {
        await callAI("/ai/design/generate", { projectId, runId, prd: input.prd });
      } else if (agentType === "architecture") {
        await callAI("/ai/architecture/generate", { projectId, runId, prd: input.prd, design: input.design });
      } else if (agentType === "developer") {
        await callAI("/ai/code/develop", { projectId, runId, architecture: input.architecture, prd: input.prd, design: input.design });
      } else if (agentType === "testing") {
        await callAI("/ai/code/test", { projectId, runId, input });
      } else if (agentType === "chat") {
        await callAI("/ai/chat", { projectId, runId, input });
      }
      logger.info(`Successfully dispatched agent ${agentType} for run ${runId}`);
    } catch (error) {
      logger.error(`Failed to dispatch agent ${agentType}:`, error);
      throw error;
    }
  },
  { connection: redis }
);

aiWorker.on("error", (err) => {
  logger.error("BullMQ AI Worker Error:", err);
});
