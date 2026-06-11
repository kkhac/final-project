"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { promptsApi } from "@/lib/api";

export function VersionHistory({ promptId }: { promptId: number }) {
  const qc = useQueryClient();
  const [newPrompt, setNewPrompt] = useState("");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: versions = [] } = useQuery({
    queryKey: ["versions", promptId],
    queryFn: () => promptsApi.listVersions(promptId).then(r => r.data),
  });                                                    // ← add this

  const addVersion = useMutation({
    mutationFn: () =>
      promptsApi.createVersion(promptId, { system_prompt: newPrompt, notes }).then(r => r.data),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["versions", promptId] });
      qc.invalidateQueries({ queryKey: ["prompts"] });
      setNewPrompt(""); setNotes(""); setAdding(false);
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700">Version History</h2>
        <button
          onClick={() => setAdding(true)}
          className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Version
        </button>
      </div>

      {adding && (
        <div className="mb-4 bg-white border border-blue-200 rounded-lg p-3 space-y-2">
          <textarea
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
            rows={4}
            placeholder="New system prompt *"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
          />
          <input
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="Notes (what changed?)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => addVersion.mutate()}
              disabled={!newPrompt || addVersion.isPending}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {addVersion.isPending ? "Saving…" : "Save Version"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {versions.map((v) => (
          <div
            key={v.id}
            className="bg-white border border-gray-200 rounded-lg px-4 py-3"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">
                v{v.version_number}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(v.created_at).toLocaleDateString()}
              </span>
            </div>
            {v.notes && (
              <p className="text-xs text-gray-500 mb-1">{v.notes}</p>
            )}
            <pre className="text-xs text-gray-600 bg-gray-50 rounded p-2 overflow-x-auto whitespace-pre-wrap">
              {v.system_prompt}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}