import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const plans = await db.subscriptionPlan.findMany({
      orderBy: { priceCents: "asc" },
    });

    if (plans.length === 0) {
      // Fallback seed plans if not seeded yet
      return NextResponse.json({
        plans: [
          {
            id: "free",
            name: "Free",
            priceCents: 0,
            aiCredits: 100,
            buildMinutes: 60,
            storageMb: 500,
            maxProjects: 3,
          },
          {
            id: "pro",
            name: "Pro",
            priceCents: 2900,
            aiCredits: 1000,
            buildMinutes: 500,
            storageMb: 5000,
            maxProjects: 20,
          },
        ],
      });
    }

    return NextResponse.json({ plans });
  } catch (error) {
    logger.error("Error fetching billing plans:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}
