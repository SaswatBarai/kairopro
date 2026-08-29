// Worker entry point — run with: tsx --env-file=../../.env lib/workers/start.ts
import "./ai-worker";
import "./document-worker";

console.log("✅ KairoPro BullMQ Workers started — listening for jobs...");
