"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";

interface EvaluationRun {
  id: number;
  prompt_version_id: number;
  test_case_id: number;
  model_provider: string;
  model_name: string;
  status: "pending" | "running" | "completed" | "failed";
  overall_score: number | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400">—</span>;
  const pct = Math.round(score * 100);
  const color =
    pct >= 80 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600";
  return <span className={`font-mono font-semibold ${color}`}>{pct}%</span>;
}

export default function RunsPage() {
  const { data: runs, isLoading, error } = useQuery<EvaluationRun[]>({
    queryKey: ["runs"],
    queryFn: () => axios.get("/api/evaluations/").then((r) => r.data),
  });

  if (isLoading) return <div className="p-8 text-gray-500">Loading runs…</div>;
  if (error) return <div className="p-8 text-red-500">Failed to load runs.</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Evaluation Runs</h1>
      {runs && runs.length === 0 ? (
        <p className="text-gray-500">No runs yet. Trigger one from the Evaluations page.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Run</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Model</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Score</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {runs?.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-gray-700">#{run.id}</span>
                    <div className="text-xs text-gray-400 mt-0.5">
                      version {run.prompt_version_id} · tc {run.test_case_id}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{run.model_name}</span>
                    <div className="text-xs text-gray-400">{run.model_provider}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[run.status]}`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={run.overall_score} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(run.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/runs/${run.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
