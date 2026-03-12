const SUGGESTIONS = [
  { emoji: "🎨", text: "Best AI tools for image generation", gradient: "from-pink-500/10 to-rose-500/10 hover:from-pink-500/20 hover:to-rose-500/20 dark:from-pink-500/5 dark:to-rose-500/5 dark:hover:from-pink-500/15 dark:hover:to-rose-500/15" },
  { emoji: "💻", text: "Free AI coding assistants", gradient: "from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20 dark:from-blue-500/5 dark:to-cyan-500/5 dark:hover:from-blue-500/15 dark:hover:to-cyan-500/15" },
  { emoji: "🎬", text: "AI tools for video creation", gradient: "from-purple-500/10 to-indigo-500/10 hover:from-purple-500/20 hover:to-indigo-500/20 dark:from-purple-500/5 dark:to-indigo-500/5 dark:hover:from-purple-500/15 dark:hover:to-indigo-500/15" },
  { emoji: "✍️", text: "AI writing and marketing tools", gradient: "from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 dark:from-amber-500/5 dark:to-orange-500/5 dark:hover:from-amber-500/15 dark:hover:to-orange-500/15" },
  { emoji: "🎵", text: "AI music generation tools", gradient: "from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20 dark:from-green-500/5 dark:to-emerald-500/5 dark:hover:from-green-500/15 dark:hover:to-emerald-500/15" },
  { emoji: "📊", text: "Compare ChatGPT vs Claude vs Gemini", gradient: "from-violet-500/10 to-fuchsia-500/10 hover:from-violet-500/20 hover:to-fuchsia-500/20 dark:from-violet-500/5 dark:to-fuchsia-500/5 dark:hover:from-violet-500/15 dark:hover:to-fuchsia-500/15" },
];

export function SuggestedQuestions({
  onSelect,
}: {
  onSelect: (question: string) => void;
}) {
  return (
    <div className="grid w-full max-w-lg gap-2.5 sm:grid-cols-2 stagger-children">
      {SUGGESTIONS.map((suggestion) => (
        <button
          key={suggestion.text}
          onClick={() => onSelect(suggestion.text)}
          className={`animate-slide-up flex items-center gap-3 rounded-2xl border border-gray-200/60 bg-gradient-to-r ${suggestion.gradient} px-4 py-3.5 text-left text-sm text-gray-700 transition-all hover:border-gray-300/80 hover:shadow-md active:scale-[0.97] dark:border-gray-700/60 dark:text-gray-300 dark:hover:border-gray-600/80`}
        >
          <span className="text-xl">{suggestion.emoji}</span>
          <span className="font-medium">{suggestion.text}</span>
        </button>
      ))}
    </div>
  );
}
