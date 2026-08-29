import { Worker } from "bullmq";
import { redis } from "../queue";
import { callAI } from "../ai-client";
import { db } from "../db";
import { logger } from "../logger";

export const documentWorker = new Worker(
  "document-processing",
  async (job) => {
    const { documentId, projectId } = job.data;
    logger.info(`Processing document ${documentId} for project ${projectId}`);

    // Update status to processing
    await db.document.update({
      where: { id: documentId },
      data: { processingStatus: "processing" },
    });

    try {
      // Dispatch heavy lifting (parsing, chunking, embedding) to FastAPI
      await callAI("/ai/documents/process", { documentId, projectId });
      
      // If it completes without throwing, mark as completed
      await db.document.update({
        where: { id: documentId },
        data: { processingStatus: "completed" },
      });
      logger.info(`Successfully processed document ${documentId}`);
    } catch (error) {
      logger.error(`Failed to process document ${documentId}:`, error);
      // Mark as failed
      await db.document.update({
        where: { id: documentId },
        data: { processingStatus: "failed" },
      });
      throw error;
    }
  },
  { connection: redis }
);

documentWorker.on("error", (err) => {
  logger.error("BullMQ Document Worker Error:", err);
});
