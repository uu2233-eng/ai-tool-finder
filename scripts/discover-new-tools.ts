import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// AI Tool Finder — Auto-Discovery & Update Script
// ============================================================
// This script uses Gemini AI with grounding (web search) to:
// 1. Discover newly launched AI tools from the market
// 2. Validate they don't already exist in the database
// 3. Research detailed information about each new tool
// 4. Append them to tools.json
//
// Usage:  npm run kb:discover
//         npm run kb:discover -- --count 20
// ============================================================

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
        let value = trimmed.slice(eqIndex + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
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
const NAMES_FILE = path.resolve("scripts", "tool-names.txt");
const DISCOVERY_LOG = path.resolve("scripts", "discovery-log.json");

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

function loadExistingTools(): ToolRecord[] {
  try {
    return JSON.parse(fs.readFileSync(TOOLS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function getExistingNames(tools: ToolRecord[]): Set<string> {
  return new Set(tools.map((t) => t.name.toLowerCase()));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// Step 1: Discover new AI tools using Gemini with web search
// ============================================================
async function discoverNewTools(
  existingNames: Set<string>,
  targetCount: number
): Promise<string[]> {
  console.log("🔍 Step 1: Discovering new AI tools from the market...\n");

  const existingList = Array.from(existingNames).slice(0, 100).join(", ");

  const discoveryPrompt = `You are an AI industry researcher. Your task is to find ${targetCount} NEW AI tools and products that have been launched or gained significant traction recently.

IMPORTANT: The following tools are ALREADY in our database, so do NOT include them:
${existingList}
... and ${Math.max(0, existingNames.size - 100)} more.

Focus on discovering tools from these categories:
${CATEGORIES.map((c) => `- ${c}`).join("\n")}

Look for:
1. Newly launched AI startups and products (last 6 months)
2. AI tools that are trending on Product Hunt, Hacker News, or tech blogs
3. Popular AI tools on platforms like There's An AI For That, Futurepedia, Toolify
4. Rising AI tools in specific niches (healthcare AI, legal AI, finance AI, etc.)
5. Open-source AI tools gaining GitHub stars
6. AI tools popular in Asian markets (Chinese, Japanese, Korean tools)

For each tool, provide its name only. Return a JSON array of strings.

RULES:
1. Return ONLY a JSON array of tool name strings, e.g. ["Tool A", "Tool B", ...]
2. Names must be the official product/brand name
3. Do NOT include tools that are already listed above
4. Prioritize tools with significant user base or unique value proposition
5. Include a mix from different categories
6. No markdown, no explanation — just the JSON array`;

  const result = await model.generateContent(discoveryPrompt);
  const text = result.response.text().trim();

  let jsonStr = text;
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const names: string[] = JSON.parse(jsonStr);
    // Filter out any that already exist
    const newNames = names.filter(
      (n) => !existingNames.has(n.toLowerCase())
    );
    console.log(
      `   Found ${names.length} candidates, ${newNames.length} are genuinely new\n`
    );
    return newNames.slice(0, targetCount);
  } catch {
    console.error("   ❌ Failed to parse discovery results:");
    console.error("   " + text.substring(0, 200));
    return [];
  }
}

// ============================================================
// Step 2: Research detailed info for each discovered tool
// ============================================================
async function researchTools(
  toolNames: string[]
): Promise<Partial<ToolRecord>[]> {
  console.log(`🔬 Step 2: Researching ${toolNames.length} new tools...\n`);

  const results: Partial<ToolRecord>[] = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < toolNames.length; i += BATCH_SIZE) {
    const batch = toolNames.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toolNames.length / BATCH_SIZE);

    console.log(
      `   [${batchNum}/${totalBatches}] Researching: ${batch.join(", ")}...`
    );

    const toolList = batch.map((name) => `- ${name}`).join("\n");

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
4. If you cannot find reliable information about a tool, still include it with your best assessment and note "(unverified)" in the description.
5. Return exactly ${batch.length} tool objects in the array.`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      let jsonStr = text;
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr
          .replace(/^```(?:json)?\n?/, "")
          .replace(/\n?```$/, "");
      }

      const parsed = JSON.parse(jsonStr);
      const tools = Array.isArray(parsed) ? parsed : [parsed];
      results.push(...tools);
      console.log(`   ✅ Got ${tools.length} tools\n`);
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
        i -= BATCH_SIZE; // Retry
        continue;
      }
    }

    // Rate limiting
    if (i + BATCH_SIZE < toolNames.length) {
      await sleep(4500);
    }
  }

  return results;
}

// ============================================================
// Step 3: Validate & merge into database
// ============================================================
function mergeIntoDatabase(
  existingTools: ToolRecord[],
  newTools: Partial<ToolRecord>[]
): { merged: ToolRecord[]; added: number } {
  console.log(`📦 Step 3: Merging ${newTools.length} new tools...\n`);

  const existingNames = getExistingNames(existingTools);
  let nextId =
    existingTools.length > 0
      ? Math.max(...existingTools.map((t) => t.id)) + 1
      : 1;

  const allTools = [...existingTools];
  let added = 0;

  for (const tool of newTools) {
    if (!tool.name || !tool.url || !tool.description) {
      console.log(`   ⚠️  Skipping invalid tool: ${tool.name || "unknown"}`);
      continue;
    }

    if (existingNames.has(tool.name.toLowerCase())) {
      console.log(`   ⚠️  Skipping duplicate: ${tool.name}`);
      continue;
    }

    // Validate category
    const category = CATEGORIES.includes(tool.category || "")
      ? tool.category!
      : "General AI & Search";

    const record: ToolRecord = {
      id: nextId++,
      name: tool.name,
      company: tool.company || "Unknown",
      url: tool.url,
      category,
      description: tool.description,
      keyFeatures: tool.keyFeatures || [],
      pricing: tool.pricing || {
        free: false,
        startingPrice: "Unknown",
        plans: [],
      },
      bestFor: tool.bestFor || [],
      lastUpdated: new Date().toISOString().split("T")[0],
    };

    allTools.push(record);
    existingNames.add(tool.name.toLowerCase());
    added++;
  }

  return { merged: allTools, added };
}

// ============================================================
// Step 4: Update tool-names.txt (keep it in sync)
// ============================================================
function updateToolNamesList(tools: ToolRecord[]) {
  const byCategory = new Map<string, string[]>();

  for (const tool of tools) {
    const cat = tool.category;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(tool.name);
  }

  const lines: string[] = [];
  for (const cat of CATEGORIES) {
    const names = byCategory.get(cat);
    if (!names || names.length === 0) continue;
    lines.push(`# ${cat}`);
    for (const name of names.sort()) {
      lines.push(name);
    }
    lines.push("");
  }

  fs.writeFileSync(NAMES_FILE, lines.join("\n") + "\n");
}

// ============================================================
// Step 5: Log discovery run
// ============================================================
function logRun(addedCount: number, toolNames: string[]) {
  let log: { runs: unknown[] } = { runs: [] };
  try {
    log = JSON.parse(fs.readFileSync(DISCOVERY_LOG, "utf-8"));
  } catch {
    // fresh log
  }

  log.runs.push({
    timestamp: new Date().toISOString(),
    discovered: toolNames.length,
    added: addedCount,
    tools: toolNames,
  });

  fs.writeFileSync(DISCOVERY_LOG, JSON.stringify(log, null, 2));
}

// ============================================================
// Main
// ============================================================
async function main() {
  const targetCount =
    parseInt(
      process.argv.find((a) => a.startsWith("--count="))?.split("=")[1] ??
        (process.argv.includes("--count")
          ? process.argv[process.argv.indexOf("--count") + 1]
          : "15"),
      10
    ) || 15;

  console.log("╔══════════════════════════════════════════╗");
  console.log("║   AI Tool Finder — Auto Discovery 🤖    ║");
  console.log("╚══════════════════════════════════════════╝\n");
  console.log(`Target: discover up to ${targetCount} new tools\n`);

  // Load existing
  const existingTools = loadExistingTools();
  const existingNames = getExistingNames(existingTools);
  console.log(`📊 Current database: ${existingTools.length} tools\n`);

  // Step 1: Discover
  const newToolNames = await discoverNewTools(existingNames, targetCount);
  if (newToolNames.length === 0) {
    console.log("❌ No new tools discovered. Try again later.");
    return;
  }

  console.log(`📋 New tools to research:\n`);
  newToolNames.forEach((name, i) => console.log(`   ${i + 1}. ${name}`));
  console.log();

  // Step 2: Research
  const researched = await researchTools(newToolNames);

  // Step 3: Merge
  const { merged, added } = mergeIntoDatabase(existingTools, researched);

  // Save
  fs.writeFileSync(TOOLS_FILE, JSON.stringify(merged, null, 2));
  console.log(`💾 Saved ${merged.length} total tools to tools.json`);

  // Step 4: Update names list
  updateToolNamesList(merged);
  console.log(`📝 Updated tool-names.txt`);

  // Step 5: Log
  logRun(
    added,
    researched.map((t) => t.name || "unknown")
  );
  console.log(`📊 Discovery logged to discovery-log.json`);

  console.log(
    `\n🎉 Done! Added ${added} new tools (${merged.length} total)\n`
  );
}

main().catch(console.error);
