"use client";
import { useQuery } from "@tanstack/react-query";
import { evaluationsApi } from "@/lib/api";
import type { PromptVersion } from "@/lib/api";

interface Props {
  promptId: number;
  versions: PromptVersion[];
}

function TrendBadge({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null)
    return <span className="text-gray-400 text-xs">—</span>;
  const diff = current - previous;
  if (Math.abs(diff) < 0.01)
    return <span className="text-gray-500 text-xs">= no change</span>;
  if (diff > 0)
    return <span className="text-green-600 text-xs font-semibold">↑ +{diff.toFixed(2)}</span>;
  return (
    <span className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold">
      ↓ {diff.toFixed(2)}
      <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs">REGRESSION</span>
    </span>
  );
}

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400">—</span>;
  const color =
    score >= 0.7 ? "text-green-600" :
    score >= 0.4 ? "text-yellow-600" :
    "text-red-600";
  return <span className={`font-semibold ${color}`}>{score.toFixed(2)}</span>;
}

function StatusPill({ status }: { status: string }) {
  const s: Record<string, string> = {
    pending:   "bg-yellow-100 text-yellow-700",
    running:   "bg-blue-100   text-blue-700",
    completed: "bg-green-100  text-green-700",
    failed:    "bg-red-100    text-red-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

export function EvaluationHistory({ promptId, versions }: Props) {
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ["eval-history", promptId],
    queryFn: () => evaluationsApi.getHistory(promptId).then(r => r.data),
    enabled: !!promptId,
  });

  if (isLoading) return <p className="text-sm text-gray-400 mt-8">Loading history…</p>;
  if (runs.length === 0) return null;

  const versionMap = Object.fromEntries(versions.map(v => [v.id, v.version_number]));

  const completedWithScore = runs.filter(r => r.status === "completed" && r.overall_score !== null);
  const hasRegression = completedWithScore.some((run, i) => {
    const prev = completedWithScore[i + 1];
    return prev && (run.overall_score ?? 0) < (prev.overall_score ?? 0);
  });

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Evaluation History</h2>
        {hasRegression && (
          <span className="bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            ⚠ Regression Detected
          </span>
        )}
        {!hasRegression && completedWithScore.length > 1 && (
          <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            ✓ No Regression
          </span>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Run", "Version", "Model", "Status", "Score", "vs Previous", "Date"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {runs.map((run, i) => {
              const prev = runs[i + 1];
              const vNum = versionMap[run.prompt_version_id];
              return (
                <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-700">#{run.id}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {vNum !== undefined ? `v${vNum}` : `id:${run.prompt_version_id}`}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{run.model_provider} / {run.model_name}</td>
                  <td className="px-4 py-3"><StatusPill status={run.status} /></td>
                  <td className="px-4 py-3"><ScoreCell score={run.overall_score} /></td>
                  <td className="px-4 py-3">
                    <TrendBadge current={run.overall_score} previous={prev?.overall_score ?? null} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(run.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
