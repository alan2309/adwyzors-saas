import { Queue } from "bullmq";
import { config } from "@adwyzors/config";

/**
 * Shared BullMQ connection options.
 */
export const connection = { url: config.redis.url };

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 1000,
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
};

export const emailQueue = new Queue("email", { connection, defaultJobOptions });
export const pdfQueue = new Queue("pdf", { connection, defaultJobOptions });
export const importQueue = new Queue("import", { connection, defaultJobOptions });
export const exportQueue = new Queue("export", { connection, defaultJobOptions });
export const automationQueue = new Queue("automation", { connection, defaultJobOptions });
