import { logger } from "@adwyzors/logger";
import { startEmailWorker } from "./workers/email.worker.js";
import { startPdfWorker } from "./workers/pdf.worker.js";
import { startImportWorker } from "./workers/import.worker.js";
import { startExportWorker } from "./workers/export.worker.js";

logger.info("Starting BullMQ background worker service...");

try {
  startEmailWorker();
  startPdfWorker();
  startImportWorker();
  startExportWorker();

  logger.info("Background worker service started successfully (4 workers)");
} catch (err) {
  logger.fatal({ err }, "Failed to start background worker service");
  process.exit(1);
}

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down workers gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down workers gracefully...");
  process.exit(0);
});
