import { logger } from "./logger";

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://localhost:8000";
const AI_SERVICE_TOKEN = process.env.AI_SERVICE_TOKEN || "development_secret_token";

export async function callAI(path: string, payload: any, method: string = "POST") {
  const url = `${AI_ENGINE_URL}${path}`;
  
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AI_SERVICE_TOKEN}`,
      },
      body: method !== "GET" ? JSON.stringify(payload) : undefined,
    });

    if (!res.ok) {
      const errorText = await res.text();
      logger.error(`AI Engine error (${res.status}):`, errorText);
      throw new Error(`AI Engine failed with status ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    logger.error("Failed to communicate with AI Engine:", error);
    throw error;
  }
}
