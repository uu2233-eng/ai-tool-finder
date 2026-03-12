import type { AITool } from "@/lib/types";

export function ToolCard({ tool }: { tool: AITool }) {
  return (
    <a
      href={tool.url}
      target="_blank"
      rel="noopener noreferrer"
      className="tool-card-hover group flex flex-col rounded-2xl border border-gray-200/80 bg-white/90 p-4 backdrop-blur-sm dark:border-gray-700/80 dark:bg-gray-800/90"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400 transition-colors">
            {tool.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {tool.company}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            tool.pricing.free
              ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-800/40"
              : "bg-amber-100 text-amber-700 ring-1 ring-amber-200/60 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-800/40"
          }`}
        >
          {tool.pricing.free ? "Free" : tool.pricing.startingPrice}
        </span>
      </div>

      <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        {tool.description}
      </p>

      <div className="mt-auto flex flex-wrap gap-1.5">
        {tool.bestFor.slice(0, 3).map((use) => (
          <span
            key={use}
            className="rounded-lg bg-gray-100/80 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700/80 dark:text-gray-300"
          >
            {use}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400">
        Visit website
        <svg
          className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
      </div>
    </a>
  );
}
