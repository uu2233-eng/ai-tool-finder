import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";

// Load .env.local
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
        const value = trimmed.slice(eqIndex + 1).trim();
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local not found
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

interface ToolEntry {
  name: string;
  categoryHint: string;
}

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

function readToolNames(): ToolEntry[] {
  const filePath = path.resolve("scripts", "tool-names.txt");
  const content = fs.readFileSync(filePath, "utf-8");
  const entries: ToolEntry[] = [];
  let currentCategory = "";

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) {
      currentCategory = trimmed.replace(/^#+\s*/, "");
    } else {
      entries.push({ name: trimmed, categoryHint: currentCategory });
    }
  }

  return entries;
}

async function researchBatch(tools: ToolEntry[]): Promise<unknown[]> {
  const toolList = tools
    .map((t) => `- ${t.name} (category hint: ${t.categoryHint})`)
    .join("\n");

  const prompt = `You are a technology researcher. Provide accurate, detailed information about these AI tools.

For EACH tool listed below, return a JSON object with these EXACT fields:
- "name": string (official product name)
- "company": string (parent company or creator)
- "url": string (official website URL, must start with https://)
- "category": string (MUST be one of: ${CATEGORIES.map((c) => `"${c}"`).join(", ")})
- "description": string (clear 1-2 sentence English description of what this tool does and why it's notable)
- "keyFeatures": string[] (3-5 most important features, in English)
- "pricing": { "free": boolean (true if has free tier), "startingPrice": string (e.g. "Free", "$10/month", "$20/month"), "plans": string[] (list all plan names with prices) }
- "bestFor": string[] (2-4 ideal use cases or user types, in English)

ALL content must be in ENGLISH.

Tools to research:
${toolList}

CRITICAL RULES:
1. Return ONLY a valid JSON array. No markdown code fences, no explanation, no extra text.
2. Every URL must be a real, working website URL.
3. Pricing must reflect current known information.
4. Return exactly ${tools.length} tool objects in the array.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  let jsonStr = text;
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      console.error("   ⚠️  Response is not an array, wrapping...");
      return [parsed];
    }
    return parsed;
  } catch {
    console.error(
      "   ❌ Failed to parse JSON. Raw response (first 300 chars):"
    );
    console.error("   " + text.substring(0, 300));
    return [];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 Building AI Tool Knowledge Base...\n");

  const toolEntries = readToolNames();
  console.log(`📋 Found ${toolEntries.length} tools to research\n`);

  const OUTPUT_FILE = path.resolve("src", "data", "tools.json");

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Load existing progress for resume support
  let existingTools: { id: number; name: string; [key: string]: unknown }[] =
    [];
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const raw = fs.readFileSync(OUTPUT_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        existingTools = parsed;
        console.log(
          `📦 Found ${existingTools.length} existing tools, will resume from there.\n`
        );
      }
    } catch {
      existingTools = [];
    }
  }

  const processedNames = new Set(
    existingTools.map((t) => t.name.toLowerCase())
  );
  const remainingTools = toolEntries.filter(
    (t) => !processedNames.has(t.name.toLowerCase())
  );

  if (remainingTools.length === 0) {
    console.log("✅ All tools already processed! Nothing to do.");
    return;
  }

  console.log(`🔍 ${remainingTools.length} tools remaining to research\n`);

  const BATCH_SIZE = 5;
  let allTools = [...existingTools];
  let nextId =
    existingTools.length > 0
      ? Math.max(...existingTools.map((t) => t.id)) + 1
      : 1;

  for (let i = 0; i < remainingTools.length; i += BATCH_SIZE) {
    const batch = remainingTools.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(remainingTools.length / BATCH_SIZE);

    console.log(
      `[${batchNum}/${totalBatches}] Researching: ${batch.map((t) => t.name).join(", ")}...`
    );

    try {
      const results = await researchBatch(batch);

      for (const tool of results) {
        allTools.push({
          ...(tool as Record<string, unknown>),
          id: nextId++,
          lastUpdated: new Date().toISOString().split("T")[0],
        });
      }

      // Save progress after each batch
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allTools, null, 2));
      console.log(
        `   ✅ Done (${allTools.length}/${toolEntries.length} total)\n`
      );
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Error: ${errMsg}\n`);

      if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("Resource has been exhausted")) {
        console.log("   ⏳ Rate limited, waiting 60 seconds...\n");
        await sleep(60000);
        i -= BATCH_SIZE; // Retry this batch
        continue;
      }
    }

    // Rate limiting: wait between batches
    if (i + BATCH_SIZE < remainingTools.length) {
      await sleep(4500);
    }
  }

  console.log(
    `\n🎉 Knowledge base complete! ${allTools.length} tools saved to ${OUTPUT_FILE}`
  );
}

main().catch(console.error);
