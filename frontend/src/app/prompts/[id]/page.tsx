"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { VersionHistory } from "@/components/prompts/VersionHistory";
import { promptsApi } from "@/lib/api";

export default function PromptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const promptId = Number(id);

  const { data: prompt, isLoading } = useQuery({
    queryKey: ["prompt", promptId],
    queryFn: () => promptsApi.get(promptId).then(r => r.data),
  });                                               // ← add this

  if (isLoading) return <p className="p-8 text-gray-500">Loading…</p>;
  if (!prompt) return <p className="p-8 text-red-500">Prompt not found.</p>;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Link href="/prompts" className="text-sm text-blue-600 hover:underline mb-4 block">
        ← Back to Prompts
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">{prompt.name}</h1>
      {prompt.description && (
        <p className="text-gray-500 mt-1 mb-6">{prompt.description}</p>
      )}

      <VersionHistory promptId={promptId} />
    </div>
  );
}