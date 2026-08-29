import { documentWorker } from "../lib/workers/document-worker";
import { logger } from "../lib/logger";

logger.info("Starting KairoPro background workers...");

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down workers gracefully...");
  await documentWorker.close();
  process.exit(0);
});
