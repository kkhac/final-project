"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { testCasesApi } from "@/lib/api";

export function ScenarioList() {
  const qc = useQueryClient();
  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ["test-cases"],
    queryFn: () => testCasesApi.list().then((r) => r.data),
  });

  const del = useMutation({
    mutationFn: (id: number) => testCasesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["test-cases"] }),
  });

  if (isLoading) return <p className="text-gray-500">Loading…</p>;

  if (scenarios.length === 0) {
    return (
      <p className="text-gray-400 text-sm">
        No scenarios yet. Click “+ New Scenario” to start.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {scenarios.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
        >
          <div>
            <p className="font-medium text-gray-900">{s.name}</p>
            {s.description && (
              <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              {s.type === "multi_turn" ? "Multi-turn" : "Single-turn"} ·{" "}
              {s.steps?.length ?? 0} step(s)
            </p>
          </div>
          <button
            onClick={() => del.mutate(s.id)}
            className="text-xs text-red-400 hover:text-red-600"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
