"use client";
import { useState } from "react";
import type { PromptVersion } from "@/lib/api";
import { promptsApi } from "@/lib/api";

interface Props {
  promptId: number;
  versions: PromptVersion[];
}

function diffLines(a: string, b: string) {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const maxLen = Math.max(aLines.length, bLines.length);
  const result = [];
  for (let i = 0; i < maxLen; i++) {
    result.push({ a: aLines[i] ?? null, b: bLines[i] ?? null });
  }
  return result;
}

export function VersionComparison({ promptId, versions }: Props) {
  const [v1Id, setV1Id] = useState<number>(versions[0]?.id ?? 0);
  const [v2Id, setV2Id] = useState<number>(versions[1]?.id ?? 0);
  const [result, setResult] = useState<{ version_a: PromptVersion; version_b: PromptVersion } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCompare() {
    setLoading(true);
    setError(null);
    try {
      const r = await promptsApi.compare(promptId, v1Id, v2Id);
      setResult(r.data);
    } catch {
      setError("Failed to load comparison.");
    } finally {
      setLoading(false);
    }
  }

  const diff = result ? diffLines(result.version_a.system_prompt, result.version_b.system_prompt) : [];

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Compare Versions</h2>

      <div className="flex items-center gap-4 mb-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Version A</label>
          <select
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            value={v1Id}
            onChange={e => setV1Id(Number(e.target.value))}
          >
            {versions.map(v => (
              <option key={v.id} value={v.id}>v{v.version_number}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Version B</label>
          <select
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            value={v2Id}
            onChange={e => setV2Id(Number(e.target.value))}
          >
            {versions.map(v => (
              <option key={v.id} value={v.id}>v{v.version_number}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCompare}
          disabled={loading}
          className="mt-5 bg-indigo-600 text-white px-4 py-1.5 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Comparing…" : "Compare"}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {result && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-200">
            <div className="px-4 py-2 text-sm font-medium text-gray-700 border-r border-gray-200">
              v{result.version_a.version_number}
              {result.version_a.notes && <span className="ml-2 text-gray-400">— {result.version_a.notes}</span>}
            </div>
            <div className="px-4 py-2 text-sm font-medium text-gray-700">
              v{result.version_b.version_number}
              {result.version_b.notes && <span className="ml-2 text-gray-400">— {result.version_b.notes}</span>}
            </div>
          </div>
          <div className="font-mono text-xs">
            {diff.map((row, i) => {
              const changed = row.a !== row.b;
              return (
                <div key={i} className="grid grid-cols-2">
                  <div className={`px-4 py-0.5 border-r border-gray-200 whitespace-pre-wrap ${changed && row.a !== null ? "bg-red-50 text-red-700" : "text-gray-700"}`}>
                    {row.a ?? ""}
                  </div>
                  <div className={`px-4 py-0.5 whitespace-pre-wrap ${changed && row.b !== null ? "bg-green-50 text-green-700" : "text-gray-700"}`}>
                    {row.b ?? ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
