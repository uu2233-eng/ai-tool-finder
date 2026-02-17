import toolsData from "@/data/tools.json";
import type { AITool } from "./types";

const tools: AITool[] = toolsData as AITool[];

function getRelevanceScore(tool: AITool, query: string): number {
  let score = 0;
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);

  // Exact name match gets highest score
  if (tool.name.toLowerCase() === q) return 100;

  // Name contains query
  if (tool.name.toLowerCase().includes(q)) score += 15;

  // Word-level matching
  for (const word of words) {
    if (word.length < 2) continue;
    if (tool.name.toLowerCase().includes(word)) score += 8;
    if (tool.company.toLowerCase().includes(word)) score += 4;
    if (tool.description.toLowerCase().includes(word)) score += 5;
    if (tool.category.toLowerCase().includes(word)) score += 3;
    for (const f of tool.keyFeatures) {
      if (f.toLowerCase().includes(word)) score += 3;
    }
    for (const b of tool.bestFor) {
      if (b.toLowerCase().includes(word)) score += 3;
    }
  }

  return score;
}

export function searchTools(params: {
  query?: string;
  category?: string;
  free_only?: boolean;
  limit?: number;
}): AITool[] {
  let results = [...tools];
  const { query, category, free_only, limit = 5 } = params;

  if (category) {
    results = results.filter((t) =>
      t.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  if (free_only) {
    results = results.filter((t) => t.pricing.free);
  }

  if (query) {
    const q = query.toLowerCase();

    // Score all tools
    const scored = results.map((tool) => ({
      tool,
      score: getRelevanceScore(tool, q),
    }));

    // Filter out zero-score results, then sort by score descending
    results = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.tool);

    // If no results with scoring, try a broader match
    if (results.length === 0) {
      const words = q.split(/\s+/).filter((w) => w.length >= 2);
      results = tools.filter((t) => {
        const text = [
          t.name,
          t.company,
          t.description,
          t.category,
          ...t.keyFeatures,
          ...t.bestFor,
        ]
          .join(" ")
          .toLowerCase();
        return words.some((word) => text.includes(word));
      });
    }
  }

  return results.slice(0, Math.min(limit, 10));
}

export function getToolDetails(toolName: string): AITool | null {
  // Try exact match first
  const exact = tools.find(
    (t) => t.name.toLowerCase() === toolName.toLowerCase()
  );
  if (exact) return exact;

  // Try partial match
  return (
    tools.find((t) =>
      t.name.toLowerCase().includes(toolName.toLowerCase())
    ) ||
    tools.find((t) =>
      toolName.toLowerCase().includes(t.name.toLowerCase())
    ) ||
    null
  );
}

export function compareTools(toolNames: string[]): AITool[] {
  return toolNames
    .map((name) => getToolDetails(name))
    .filter((t): t is AITool => t !== null);
}

export function getCategories(): { name: string; count: number }[] {
  const categoryMap = new Map<string, number>();
  tools.forEach((t) => {
    categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + 1);
  });
  return Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getTotalToolCount(): number {
  return tools.length;
}
