const SUGGESTIONS = [
  { emoji: "🎨", text: "Best AI tools for image generation" },
  { emoji: "💻", text: "Free AI coding assistants" },
  { emoji: "🎬", text: "AI tools for video creation" },
  { emoji: "✍️", text: "AI writing and marketing tools" },
  { emoji: "🎵", text: "AI music generation tools" },
  { emoji: "📊", text: "Compare ChatGPT vs Claude vs Gemini" },
];

export function SuggestedQuestions({
  onSelect,
}: {
  onSelect: (question: string) => void;
}) {
  return (
    <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
      {SUGGESTIONS.map((suggestion) => (
        <button
          key={suggestion.text}
          onClick={() => onSelect(suggestion.text)}
          className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-300"
        >
          <span className="text-lg">{suggestion.emoji}</span>
          <span>{suggestion.text}</span>
        </button>
      ))}
    </div>
  );
}
