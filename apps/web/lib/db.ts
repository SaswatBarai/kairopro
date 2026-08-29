import { PrismaClient, Prisma } from "@prisma/client";
import { logger } from "./logger";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "error" },
      { emit: "event", level: "info" },
      { emit: "event", level: "warn" },
    ],
  });

  client.$on("query" as never, (e: Prisma.QueryEvent) => {
    logger.info(`Query: ${e.query} - Params: ${e.params} - Duration: ${e.duration}ms`);
  });

  client.$on("error" as never, (e: Prisma.LogEvent) => {
    logger.error(e.message);
  });

  client.$on("warn" as never, (e: Prisma.LogEvent) => {
    logger.warn(e.message);
  });

  client.$on("info" as never, (e: Prisma.LogEvent) => {
    logger.info(e.message);
  });

  return client;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
