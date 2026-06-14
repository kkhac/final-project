"use client";
import { useQuery } from "@tanstack/react-query";
import { evaluationsApi } from "@/lib/api";
import type { PromptVersion } from "@/lib/api";

interface Props {
  promptId: number;
  versions: PromptVersion[];
}

export function FailureAnalysis({ promptId, versions }: Props) {
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ["eval-history", promptId],
    queryFn: () => evaluationsApi.getHistory(promptId).then(r => r.data),
    enabled: !!promptId,
  });

  if (isLoading) return null;

  const allResults = runs.flatMap(r => r.results ?? []);
  if (allResults.length === 0) return null;

  const versionMap = Object.fromEntries(versions.map(v => [v.id, v.version_number]));

  // --- Category breakdown ---
  const categoryCount: Record<string, number> = {};
  allResults.forEach(r => {
    if (r.failure_category) {
      categoryCount[r.failure_category] = (categoryCount[r.failure_category] ?? 0) + 1;
    }
    if (r.keyword_check_passed === false) {
      categoryCount["keyword_missing"] = (categoryCount["keyword_missing"] ?? 0) + 1;
    }
    if (r.format_check_passed === false) {
      categoryCount["format_error"] = (categoryCount["format_error"] ?? 0) + 1;
    }
  });
  const totalFailures = Object.values(categoryCount).reduce((a, b) => a + b, 0);
  const sortedCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);

  // --- Per-version stats ---
  const versionStats: Record<number, {
    runs: number; totalScore: number; scoredRuns: number;
    passedSteps: number; totalSteps: number;
  }> = {};
  runs.forEach(run => {
    const vId = run.prompt_version_id;
    if (!versionStats[vId]) {
      versionStats[vId] = { runs: 0, totalScore: 0, scoredRuns: 0, passedSteps: 0, totalSteps: 0 };
    }
    versionStats[vId].runs++;
    if (run.overall_score !== null) {
      versionStats[vId].totalScore += run.overall_score;
      versionStats[vId].scoredRuns++;
    }
    (run.results ?? []).forEach(r => {
      versionStats[vId].totalSteps++;
      if (r.keyword_check_passed !== false && r.format_check_passed !== false) {
        versionStats[vId].passedSteps++;
      }
    });
  });

  // --- Summary ---
  const passedSteps = allResults.filter(
    r => r.keyword_check_passed !== false && r.format_check_passed !== false
  ).length;
  const passRate = allResults.length > 0
    ? Math.round((passedSteps / allResults.length) * 100)
    : 0;

  // --- Recent failures ---
  const recentFailures = runs
    .flatMap(run =>
      (run.results ?? [])
        .filter(r => r.failure_reason || r.failure_category ||
          r.keyword_check_passed === false || r.format_check_passed === false)
        .map(r => ({ ...r, runId: run.id, versionId: run.prompt_version_id }))
    )
    .slice(0, 5);

  if (sortedCategories.length === 0 && recentFailures.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Failure Analysis</h2>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{allResults.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Steps Evaluated</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className={`text-2xl font-bold ${passRate >= 70 ? "text-green-600" : passRate >= 40 ? "text-yellow-600" : "text-red-600"}`}>
            {passRate}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Overall Pass Rate</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{totalFailures}</p>
          <p className="text-xs text-gray-500 mt-1">Total Failures</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Failure by category */}
        {sortedCategories.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-semibold text-gray-700">Failures by Category</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Category</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Count</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedCategories.map(([cat, count]) => (
                  <tr key={cat} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700 font-mono text-xs">{cat}</td>
                    <td className="px-4 py-2 text-gray-700">{count}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-red-400 h-1.5 rounded-full"
                            style={{ width: `${Math.round((count / totalFailures) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8">
                          {Math.round((count / totalFailures) * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pass rate by version */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">Pass Rate by Version</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Version</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Runs</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Avg Score</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Pass Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(versionStats).map(([vId, stats]) => {
                const vNum = versionMap[Number(vId)];
                const avg = stats.scoredRuns > 0 ? stats.totalScore / stats.scoredRuns : null;
                const rate = stats.totalSteps > 0
                  ? Math.round((stats.passedSteps / stats.totalSteps) * 100)
                  : null;
                return (
                  <tr key={vId} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700 font-medium">
                      {vNum !== undefined ? `v${vNum}` : `id:${vId}`}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{stats.runs}</td>
                    <td className="px-4 py-2">
                      {avg !== null ? (
                        <span className={`font-semibold ${avg >= 0.7 ? "text-green-600" : avg >= 0.4 ? "text-yellow-600" : "text-red-600"}`}>
                          {avg.toFixed(2)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {rate !== null ? (
                        <span className={`font-semibold ${rate >= 70 ? "text-green-600" : rate >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                          {rate}%
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent failures */}
      {recentFailures.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">Recent Failures</p>
          </div>
          <div className="divide-y divide-gray-100">
            {recentFailures.map((r, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-600">
                    Run #{r.runId} · Step {r.step_number} ·{" "}
                    {versionMap[r.versionId] !== undefined ? `v${versionMap[r.versionId]}` : `id:${r.versionId}`}
                  </span>
                  {r.failure_category && (
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-mono">
                      {r.failure_category}
                    </span>
                  )}
                </div>
                {r.failure_reason && (
                  <p className="text-xs text-red-600 mb-1">✗ {r.failure_reason}</p>
                )}
                {r.judge_reasoning && (
                  <p className="text-xs text-gray-500 italic">{r.judge_reasoning}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
