"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { promptsApi } from "@/lib/api";

export function PromptEditor() {
  const qc = useQueryClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [open, setOpen] = useState(false);

  const create = useMutation({
    mutationFn: () =>
      promptsApi.create({ name, description, system_prompt: systemPrompt }).then(r => r.data),
    onSuccess: (prompt) => {
      qc.invalidateQueries({ queryKey: ["prompts"] });
      setName(""); setDescription(""); setSystemPrompt(""); setOpen(false);
      router.push(`/prompts/${prompt.id}`);
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-6 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
      >
        + New Prompt
      </button>
    );
  }

  return (
    <div className="mb-6 bg-white border border-indigo-200 rounded-xl p-5 shadow-sm space-y-4">
      <h2 className="font-semibold text-gray-700">New Prompt</h2>

      <input
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        placeholder="Name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <textarea
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
        rows={5}
        placeholder="System prompt *"
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
      />

      <div className="flex gap-2">
        <button
          onClick={() => create.mutate()}
          disabled={!name || !systemPrompt || create.isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {create.isPending ? "Creating…" : "Create"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}