import type { AITool } from "@/lib/types";

export function ToolCard({ tool }: { tool: AITool }) {
  return (
    <a
      href={tool.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-gray-900 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
            {tool.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {tool.company}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            tool.pricing.free
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
          }`}
        >
          {tool.pricing.free ? "Free" : tool.pricing.startingPrice}
        </span>
      </div>

      <p className="mb-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
        {tool.description}
      </p>

      <div className="mt-auto flex flex-wrap gap-1.5">
        {tool.bestFor.slice(0, 3).map((use) => (
          <span
            key={use}
            className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
          >
            {use}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center text-xs font-medium text-blue-600 dark:text-blue-400">
        Visit website
        <svg
          className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5"
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
