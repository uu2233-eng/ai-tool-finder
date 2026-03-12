import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// AI Tool Finder — Refresh Stale Data
// ============================================================
// Updates tool records that haven't been refreshed recently.
// Focuses on correcting pricing, URLs, descriptions, and features
// that may have changed since the tool was originally added.
//
// Usage:  npm run kb:refresh
//         npm run kb:refresh -- --days 30  (refresh tools older than 30 days)
//         npm run kb:refresh -- --limit 20 (refresh max 20 tools per run)
// ============================================================

function loadEnv() {
  try {
    const envPath = path.resolve(".env.local");
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value;
      }
    }
  } catch {
    // ignore
  }
}

loadEnv();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY not found. Set it in .env.local");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const CATEGORIES = [
  "General AI & Search",
  "Image Generation",
  "Video Generation",
  "Audio & Music",
  "Design & Creative",
  "Developer Tools",
  "AI Infrastructure",
  "Writing & Marketing",
  "Productivity & Office",
  "Education & Learning",
  "Entertainment & Lifestyle",
  "Data & Research",
];

const TOOLS_FILE = path.resolve("src", "data", "tools.json");

interface ToolRecord {
  id: number;
  name: string;
  company: string;
  url: string;
  category: string;
  description: string;
  keyFeatures: string[];
  pricing: { free: boolean; startingPrice: string; plans: string[] };
  bestFor: string[];
  lastUpdated: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function getStaleTools(
  tools: ToolRecord[],
  olderThanDays: number,
  limit: number
): ToolRecord[] {
  return tools
    .filter((t) => daysSince(t.lastUpdated) >= olderThanDays)
    .sort((a, b) => daysSince(b.lastUpdated) - daysSince(a.lastUpdated)) // oldest first
    .slice(0, limit);
}

async function refreshBatch(tools: ToolRecord[]): Promise<ToolRecord[]> {
  const toolList = tools
    .map(
      (t) =>
        `- ${t.name} (current URL: ${t.url}, current category: ${t.category})`
    )
    .join("\n");

  const prompt = `You are a technology researcher. Provide UPDATED, ACCURATE information about these AI tools.

For EACH tool listed below, return a JSON object with these EXACT fields:
- "name": string (official product name — keep original if still correct)
- "company": string (parent company or creator)
- "url": string (current official website URL, must start with https://)
- "category": string (MUST be one of: ${CATEGORIES.map((c) => `"${c}"`).join(", ")})
- "description": string (clear 1-2 sentence English description — update if the product has changed)
- "keyFeatures": string[] (3-5 most important CURRENT features, in English)
- "pricing": { "free": boolean (true if has free tier), "startingPrice": string, "plans": string[] (current plan names with prices) }
- "bestFor": string[] (2-4 ideal use cases or user types, in English)
- "status": string ("active" if still operating, "discontinued" if shut down, "renamed" if rebranded)

ALL content must be in ENGLISH.

Tools to verify and update:
${toolList}

CRITICAL RULES:
1. Return ONLY a valid JSON array. No markdown, no explanation.
2. If a tool has been discontinued or acquired, note it in status and description.
3. If pricing has changed, provide the LATEST pricing.
4. URLs must be currently valid.
5. Return exactly ${tools.length} tool objects.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  let jsonStr = text;
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    console.error("   ❌ Failed to parse refresh results");
    console.error("   " + text.substring(0, 200));
    return [];
  }
}

async function main() {
  const args = process.argv;
  const olderThanDays =
    parseInt(
      args.find((a) => a.startsWith("--days="))?.split("=")[1] ??
        (args.includes("--days") ? args[args.indexOf("--days") + 1] : "30"),
      10
    ) || 30;
  const limit =
    parseInt(
      args.find((a) => a.startsWith("--limit="))?.split("=")[1] ??
        (args.includes("--limit") ? args[args.indexOf("--limit") + 1] : "25"),
      10
    ) || 25;

  console.log("╔══════════════════════════════════════════╗");
  console.log("║   AI Tool Finder — Data Refresh 🔄      ║");
  console.log("╚══════════════════════════════════════════╝\n");

  const allTools: ToolRecord[] = JSON.parse(
    fs.readFileSync(TOOLS_FILE, "utf-8")
  );
  console.log(`📊 Database: ${allTools.length} tools`);
  console.log(`📅 Refreshing tools not updated in ${olderThanDays}+ days`);
  console.log(`📦 Max tools per run: ${limit}\n`);

  const staleTools = getStaleTools(allTools, olderThanDays, limit);

  if (staleTools.length === 0) {
    console.log("✅ All tools are up to date! Nothing to refresh.");
    return;
  }

  console.log(`🔍 Found ${staleTools.length} stale tools to refresh:\n`);
  staleTools.forEach((t) =>
    console.log(`   - ${t.name} (last updated: ${t.lastUpdated})`)
  );
  console.log();

  const BATCH_SIZE = 5;
  let updated = 0;
  let discontinued = 0;

  for (let i = 0; i < staleTools.length; i += BATCH_SIZE) {
    const batch = staleTools.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(staleTools.length / BATCH_SIZE);

    console.log(
      `[${batchNum}/${totalBatches}] Refreshing: ${batch.map((t) => t.name).join(", ")}...`
    );

    try {
      const refreshed = await refreshBatch(batch);

      for (const update of refreshed) {
        const idx = allTools.findIndex(
          (t) => t.name.toLowerCase() === (update.name || "").toLowerCase()
        );
        if (idx === -1) continue;

        const status = (update as unknown as { status: string }).status;

        if (status === "discontinued") {
          console.log(
            `   ⚠️  ${update.name} is DISCONTINUED — removing from database`
          );
          allTools.splice(idx, 1);
          discontinued++;
          continue;
        }

        // Update fields
        allTools[idx] = {
          ...allTools[idx],
          company: update.company || allTools[idx].company,
          url: update.url || allTools[idx].url,
          category:
            CATEGORIES.includes(update.category || "")
              ? update.category!
              : allTools[idx].category,
          description: update.description || allTools[idx].description,
          keyFeatures: update.keyFeatures?.length
            ? update.keyFeatures
            : allTools[idx].keyFeatures,
          pricing: update.pricing || allTools[idx].pricing,
          bestFor: update.bestFor?.length
            ? update.bestFor
            : allTools[idx].bestFor,
          lastUpdated: new Date().toISOString().split("T")[0],
        };
        updated++;
      }

      // Save after each batch
      fs.writeFileSync(TOOLS_FILE, JSON.stringify(allTools, null, 2));
      console.log(`   ✅ Batch done\n`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Error: ${errMsg}\n`);

      if (
        errMsg.includes("429") ||
        errMsg.includes("quota") ||
        errMsg.includes("Resource has been exhausted")
      ) {
        console.log("   ⏳ Rate limited, waiting 60 seconds...\n");
        await sleep(60000);
        i -= BATCH_SIZE;
        continue;
      }
    }

    if (i + BATCH_SIZE < staleTools.length) {
      await sleep(4500);
    }
  }

  console.log(
    `\n🎉 Refresh complete! Updated ${updated} tools, removed ${discontinued} discontinued tools.`
  );
  console.log(`📊 Database now has ${allTools.length} tools.\n`);
}

main().catch(console.error);
