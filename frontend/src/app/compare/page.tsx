"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, promptsApi } from "@/lib/api";

interface Prompt {
  id: number;
  name: string;
}

interface PromptVersion {
  id: number;
  version_number: number;
  notes: string | null;
}

interface EvaluationRun {
  id: number;
  model_provider: string;
  model_name: string;
  overall_score: number | null;
  status: string;
  created_at: string;
}

interface ModelGroup {
  key: string;
  provider: string;
  model: string;
  runs: EvaluationRun[];
  avgScore: number | null;
}

function groupByModel(runs: EvaluationRun[]): ModelGroup[] {
  const map = new Map<string, EvaluationRun[]>();
  for (const run of runs) {
    const key = `${run.model_provider}/${run.model_name}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(run);
  }
  return Array.from(map.entries()).map(([key, rs]) => {
    const scored = rs.filter((r) => r.overall_score !== null);
    const avg =
      scored.length > 0
        ? scored.reduce((s, r) => s + r.overall_score!, 0) / scored.length
        : null;
    const [provider, model] = key.split("/");
    return { key, provider, model, runs: rs, avgScore: avg };
  });
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400">—</span>;
  const pct = Math.round(score * 100);
  const color =
    pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-32 bg-gray-200 rounded-full h-3">
        <div className={`${color} h-3 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-mono font-semibold">{pct}%</span>
    </div>
  );
}

export default function ComparePage() {
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);

  const { data: prompts } = useQuery<Prompt[]>({
    queryKey: ["prompts"],
    queryFn: () => api.get("/prompts/").then((r) => r.data),
  });

  const { data: versions = [] } = useQuery<PromptVersion[]>({
    queryKey: ["versions", selectedPromptId],
    queryFn: () =>
      promptsApi.listVersions(selectedPromptId!).then((r) => r.data),
    enabled: selectedPromptId !== null,
  });

  const { data: runs, isLoading } = useQuery<EvaluationRun[]>({
    queryKey: ["runs", selectedPromptId, selectedVersionId],
    queryFn: () =>
      api
        .get("/evaluations/", {
          params:
            selectedVersionId !== null
              ? { prompt_version_id: selectedVersionId }
              : { prompt_id: selectedPromptId },
        })
        .then((r) => r.data),
    enabled: selectedPromptId !== null,
  });

  const groups = runs ? groupByModel(runs.filter((r) => r.status === "completed")) : [];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Cross-model Comparison</h1>
      <p className="text-gray-500 text-sm">
        Select a prompt to compare average scores across all models. Pick a
        specific version to compare runs of that exact version only.
      </p>

      {/* Prompt + Version selectors */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prompt
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={selectedPromptId ?? ""}
            onChange={(e) => {
              setSelectedPromptId(e.target.value ? Number(e.target.value) : null);
              setSelectedVersionId(null);
            }}
          >
            <option value="">— select a prompt —</option>
            {prompts?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Version
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
            value={selectedVersionId ?? ""}
            onChange={(e) =>
              setSelectedVersionId(e.target.value ? Number(e.target.value) : null)
            }
            disabled={selectedPromptId === null}
          >
            <option value="">— all versions —</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.version_number}
                {v.notes ? ` — ${v.notes}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedPromptId && isLoading && (
        <p className="text-gray-500 text-sm">Loading runs…</p>
      )}

      {selectedPromptId && !isLoading && groups.length === 0 && (
        <p className="text-gray-500 text-sm">
          No completed runs found for this {selectedVersionId ? "version" : "prompt"}.
        </p>
      )}

      {groups.length > 0 && (
        <>
          {/* Score comparison bars */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Average Score by Model
            </h2>
            <div className="space-y-4">
              {groups
                .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
                .map((g) => (
                  <div key={g.key} className="flex items-center gap-4">
                    <div className="w-48 text-sm">
                      <span className="font-medium">{g.model}</span>
                      <div className="text-xs text-gray-400">{g.provider}</div>
                    </div>
                    <ScoreBar score={g.avgScore} />
                    <span className="text-xs text-gray-400">
                      {g.runs.length} run{g.runs.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Per-model run tables */}
          {groups.map((g) => (
            <div
              key={g.key}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-gray-800">{g.model}</span>
                  <span className="text-xs text-gray-400 ml-2">{g.provider}</span>
                </div>
                <ScoreBar score={g.avgScore} />
              </div>
              <table className="min-w-full text-sm divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Run</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Score</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {g.runs.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-gray-600">#{r.id}</td>
                      <td className="px-4 py-2">
                        <ScoreBar score={r.overall_score} />
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
