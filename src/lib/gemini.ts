import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
} from "@google/generative-ai";
import {
  searchTools,
  getToolDetails,
  compareTools,
  getCategories,
  getTotalToolCount,
} from "./tool-search";
import type { AITool } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are AI Tool Advisor, a friendly and knowledgeable assistant that helps people find the perfect AI tools for their needs.

You have access to a curated database of ${getTotalToolCount()}+ AI tools across categories including General AI, Image Generation, Video Generation, Audio & Music, Design & Creative, Developer Tools, AI Infrastructure, Writing & Marketing, Productivity & Office, Education & Learning, and Entertainment & Lifestyle.

RULES:
1. ALWAYS use the provided search functions to find tools before answering. Never guess or fabricate tool information.
2. Recommend 2-5 tools per query, ranked by relevance.
3. For each recommendation, clearly state: tool name, what it does, pricing info, and why it fits the user's needs.
4. If the user's needs are unclear, ask 1-2 brief clarifying questions.
5. Be conversational, concise, and helpful.
6. When comparing tools, highlight the key differences, pros, and cons.
7. Respond in the SAME LANGUAGE as the user's message. If they write in Chinese, respond in Chinese. If English, respond in English.
8. Format responses with markdown for readability (use **bold**, bullet lists, etc.).
9. Always include the tool's URL when recommending it so users can visit directly.
10. If no tools match the query, honestly say so and suggest alternatives or related categories.`;

const functionDeclarations = [
  {
    name: "search_tools",
    description:
      "Search for AI tools by keyword, category, or use case. Use this whenever the user asks for tool recommendations or searches for specific capabilities.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description:
            'Search keywords describing the desired tool functionality or use case (e.g., "video generation", "code assistant", "free image editor")',
        },
        category: {
          type: SchemaType.STRING,
          description:
            'Optional category filter. Options: "General AI & Search", "Image Generation", "Video Generation", "Audio & Music", "Design & Creative", "Developer Tools", "AI Infrastructure", "Writing & Marketing", "Productivity & Office", "Education & Learning", "Entertainment & Lifestyle"',
        },
        free_only: {
          type: SchemaType.BOOLEAN,
          description: "If true, only return tools that have a free tier",
        },
        limit: {
          type: SchemaType.NUMBER,
          description:
            "Maximum number of results to return (default: 5, max: 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_tool_details",
    description:
      "Get detailed information about a specific AI tool by name. Use when the user asks about a particular tool.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        tool_name: {
          type: SchemaType.STRING,
          description: "The name of the AI tool to look up",
        },
      },
      required: ["tool_name"],
    },
  },
  {
    name: "compare_tools",
    description:
      "Compare two or more AI tools side by side. Use when the user wants to compare specific tools.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        tool_names: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Array of tool names to compare (2-5 tools)",
        },
      },
      required: ["tool_names"],
    },
  },
  {
    name: "get_categories",
    description:
      "Get all available tool categories and the number of tools in each. Use when the user asks what types of tools are available or wants to browse categories.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
];

function executeFunctionCall(
  call: { name: string; args: Record<string, unknown> }
): { result: unknown; tools: AITool[] } {
  switch (call.name) {
    case "search_tools": {
      const args = call.args as {
        query?: string;
        category?: string;
        free_only?: boolean;
        limit?: number;
      };
      const results = searchTools({
        query: args.query,
        category: args.category,
        free_only: args.free_only,
        limit: args.limit || 5,
      });
      return { result: results, tools: results };
    }
    case "get_tool_details": {
      const args = call.args as { tool_name: string };
      const tool = getToolDetails(args.tool_name);
      return { result: tool || { error: `Tool "${args.tool_name}" not found` }, tools: tool ? [tool] : [] };
    }
    case "compare_tools": {
      const args = call.args as { tool_names: string[] };
      const results = compareTools(args.tool_names);
      return { result: results, tools: results };
    }
    case "get_categories": {
      const categories = getCategories();
      return { result: categories, tools: [] };
    }
    default:
      return { result: { error: "Unknown function" }, tools: [] };
  }
}

export async function chat(
  messages: { role: string; content: string }[],
  onStatus?: (status: string) => void
): Promise<{ text: string; toolCards: AITool[] }> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: functionDeclarations as unknown as FunctionDeclaration[] }],
  });

  // Convert to Gemini format (exclude the last message, it'll be sent separately)
  const history = messages.slice(0, -1).map((msg) => ({
    role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: msg.content }],
  }));

  const chatSession = model.startChat({ history });

  const lastMessage = messages[messages.length - 1].content;
  let result = await chatSession.sendMessage(lastMessage);
  let response = result.response;

  const allToolCards: AITool[] = [];

  // Function calling loop (max 5 iterations to prevent infinite loops)
  let iterations = 0;
  while (response.functionCalls()?.length && iterations < 5) {
    iterations++;
    onStatus?.("Searching for the best tools...");

    const functionCalls = response.functionCalls()!;
    const functionResponses = functionCalls.map((call) => {
      const { result: fnResult, tools } = executeFunctionCall(call as unknown as { name: string; args: Record<string, unknown> });
      allToolCards.push(...tools);
      return {
        functionResponse: {
          name: call.name,
          response: { result: JSON.stringify(fnResult) },
        },
      };
    });

    result = await chatSession.sendMessage(functionResponses);
    response = result.response;
  }

  const text = response.text();

  // Deduplicate tool cards by id
  const uniqueTools = Array.from(
    new Map(allToolCards.map((t) => [t.id, t])).values()
  );

  return { text, toolCards: uniqueTools };
}
