import { PromptEditor } from "@/components/prompts/PromptEditor";
import { PromptList } from "@/components/prompts/PromptList";

export default function PromptsPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Prompts</h1>
      <PromptEditor />
      <PromptList />
    </div>
  );
}