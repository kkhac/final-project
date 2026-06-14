"use client";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dashboardApi, type RecentRun } from "@/lib/api";

interface RecentRunsChartProps {
  limit?: number;
}

interface ChartDatum {
  label: string;
  score: number;
  prompt: string;
  testCase: string;
}

function toChartData(runs: RecentRun[]): ChartDatum[] {
  return runs
    .filter((r) => r.overall_score != null)
    .slice()
    .reverse()
    .map((r) => ({
      label: `#${r.id}`,
      score: Number((r.overall_score as number).toFixed(2)),
      prompt: r.prompt_name,
      testCase: r.test_case_name,
    }));
}

export function RecentRunsChart({ limit = 10 }: RecentRunsChartProps) {
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ["dashboard", "recent-runs", limit],
    queryFn: () => dashboardApi.getRecentRuns(limit).then((r) => r.data),
  });

  const chartData = toChartData(runs);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">
        Recent run scores
      </h2>
      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : chartData.length === 0 ? (
        <p className="text-gray-400 text-sm">No scored runs yet.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2ff" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 12, fill: "#6b7280" }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value: number) => [value.toFixed(2), "Score"]}
                labelFormatter={(label, payload) => {
                  const d = payload?.[0]?.payload as ChartDatum | undefined;
                  return d ? `${label} — ${d.prompt} · ${d.testCase}` : label;
                }}
              />
              <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
