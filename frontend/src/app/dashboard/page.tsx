"use client";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import { RecentRunsChart } from "@/components/dashboard/RecentRunsChart";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => dashboardApi.getStats().then((r) => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Prompts"
          value={isLoading ? "…" : String(data?.total_prompts ?? 0)}
        />
        <StatCard
          label="Test Cases"
          value={isLoading ? "…" : String(data?.total_test_cases ?? 0)}
        />
        <StatCard
          label="Avg Score"
          value={
            isLoading
              ? "…"
              : data?.avg_score != null
              ? data.avg_score.toFixed(2)
              : "—"
          }
        />
      </div>

      <div className="mt-6">
        <RecentRunsChart />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-semibold mt-1">{value}</p>
    </div>
  );
}
