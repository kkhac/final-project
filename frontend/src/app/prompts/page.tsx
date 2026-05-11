export default function PromptsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prompts</h1>
        <button className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          + New Prompt
        </button>
      </div>
      {/* TODO (Week 2, feature/prompt-management): PromptList + PromptEditor components */}
      <p className="text-gray-400 text-sm">Prompt list coming in Week 2.</p>
    </div>
  );
}
