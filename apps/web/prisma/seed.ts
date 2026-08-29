import { PrismaClient } from "@prisma/client";
import { logger } from "../lib/logger";

const db = new PrismaClient();

async function main() {
  logger.info("🌱 Seeding database...");

  // Create free subscription plan
  await db.subscriptionPlan.upsert({
    where: { id: "free" },
    update: {},
    create: {
      id: "free",
      name: "Free",
      priceCents: 0,
      aiCredits: 100,
      buildMinutes: 60,
      storageMb: 500,
      maxProjects: 3,
    },
  });

  await db.subscriptionPlan.upsert({
    where: { id: "pro" },
    update: {},
    create: {
      id: "pro",
      name: "Pro",
      priceCents: 2900,
      aiCredits: 1000,
      buildMinutes: 500,
      storageMb: 5000,
      maxProjects: 20,
    },
  });

  logger.info("✅ Seed complete.");
}

main()
  .catch((e) => {
    logger.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
