"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { SuggestedQuestions } from "./SuggestedQuestions";

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, statusText, scrollToBottom]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: ChatMessage = { role: "user", content };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setIsLoading(true);
      setStatusText("Thinking...");

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("No response stream");

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data || data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "status") {
                setStatusText(parsed.text);
              } else if (parsed.type === "result") {
                setStatusText("");
                const assistantMessage: ChatMessage = {
                  role: "assistant",
                  content: parsed.content,
                  toolCards: parsed.toolCards,
                };
                setMessages((prev) => [...prev, assistantMessage]);
              } else if (parsed.type === "error") {
                setStatusText("");
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: parsed.text },
                ]);
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }
      } catch (error) {
        console.error("Chat error:", error);
        setStatusText("");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, something went wrong. Please check your connection and try again.",
          },
        ]);
      } finally {
        setIsLoading(false);
        setStatusText("");
      }
    },
    [isLoading, messages, scrollToBottom]
  );

  return (
    <div className="flex h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-lg text-white shadow-sm">
            ✦
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              AI Tool Finder
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Find the perfect AI tool for your needs
            </p>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-3xl text-white shadow-lg">
                ✦
              </div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                Welcome to AI Tool Finder
              </h2>
              <p className="mb-8 max-w-md text-center text-gray-500 dark:text-gray-400">
                I can help you discover the perfect AI tools from our curated
                database of 200+ tools. Ask me anything!
              </p>
              <SuggestedQuestions onSelect={sendMessage} />
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {isLoading && statusText && (
                <div className="flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:300ms]" />
                  </div>
                  {statusText}
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-3xl">
          <ChatInput onSend={sendMessage} disabled={isLoading} />
          <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
            Powered by Gemini. Tool information may not reflect the latest
            updates.
          </p>
        </div>
      </div>
    </div>
  );
}
