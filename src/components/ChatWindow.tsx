"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { SuggestedQuestions } from "./SuggestedQuestions";

const STORAGE_KEY = "aitf-chat-history";

function loadHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // corrupted data, ignore
  }
  return [];
}

function saveHistory(messages: ChatMessage[]) {
  try {
    // Only keep last 50 messages to avoid storage bloat
    const toSave = messages.slice(-50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // storage full or unavailable
  }
}

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const history = loadHistory();
    if (history.length > 0) {
      setMessages(history);
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage whenever messages change (after initialization)
  useEffect(() => {
    if (isInitialized && messages.length > 0) {
      saveHistory(messages);
    }
  }, [messages, isInitialized]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, statusText, scrollToBottom]);

  const clearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

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
    [isLoading, messages]
  );

  return (
    <div className="flex h-dvh flex-col bg-gradient-to-b from-slate-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="glass shrink-0 border-b border-gray-200/60 px-4 py-3 dark:border-gray-800/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="animate-pulse-glow flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-lg text-white shadow-md animate-gradient">
              ✦
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-400">
                AI Tool Finder
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Discover 200+ AI tools powered by Gemini
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              disabled={isLoading}
              className="animate-fade-in flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-gray-600 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-400 dark:hover:border-red-600/50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
              title="Clear conversation"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              New chat
            </button>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
              <div className="relative mb-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-4xl text-white shadow-xl animate-gradient">
                  ✦
                </div>
                <div className="absolute -inset-1 -z-10 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-20 blur-lg" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                Welcome to AI Tool Finder
              </h2>
              <p className="mb-2 max-w-md text-center text-gray-500 dark:text-gray-400">
                I can help you discover the perfect AI tools from our curated
                database of 200+ tools. Ask me anything!
              </p>
              <p className="mb-8 text-xs text-gray-400 dark:text-gray-500">
                Try one of these suggestions to get started 👇
              </p>
              <SuggestedQuestions onSelect={sendMessage} />
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className="animate-fade-in" style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}>
                  <MessageBubble message={msg} />
                </div>
              ))}
              {isLoading && statusText && (
                <div className="flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400 animate-fade-in">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-500 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-purple-500 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-pink-500 [animation-delay:300ms]" />
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
      <div className="glass shrink-0 border-t border-gray-200/60 px-4 py-3 dark:border-gray-800/60">
        <div className="mx-auto max-w-3xl">
          <ChatInput onSend={sendMessage} disabled={isLoading} />
          <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
            Powered by Gemini AI · Tool data may not reflect the latest updates
          </p>
        </div>
      </div>
    </div>
  );
}
