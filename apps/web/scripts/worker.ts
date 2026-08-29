import { documentWorker } from "../lib/workers/document-worker";
import { aiWorker } from "../lib/workers/ai-worker";
import { logger } from "../lib/logger";

logger.info("Starting KairoPro background workers...");

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down workers gracefully...");
  await documentWorker.close();
  await aiWorker.close();
  process.exit(0);
});
