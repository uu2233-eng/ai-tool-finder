"use client";

import type { ChatMessage } from "@/lib/types";
import { ToolCard } from "./ToolCard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-white shadow-sm">
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-xs text-white">
          ✦
        </div>
        <div className="min-w-0 flex-1">
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:mb-2 prose-headings:mt-4 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 dark:prose-strong:text-gray-100">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {message.toolCards && message.toolCards.length > 0 && (
        <div className="ml-10 grid gap-3 sm:grid-cols-2">
          {message.toolCards.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
