"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { promptsApi, testCasesApi } from "@/lib/api";

export default function ScenarioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const scenarioId = Number(id);

  const {
    data: scenario,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["test-case", scenarioId],
    queryFn: () => testCasesApi.get(scenarioId).then((r) => r.data),
    enabled: !!scenarioId,
  });

  const { data: prompt } = useQuery({
    queryKey: ["prompt", scenario?.prompt_id],
    queryFn: () => promptsApi.get(scenario!.prompt_id).then((r) => r.data),
    enabled: !!scenario?.prompt_id,
  });

  if (isLoading) return <p className="text-gray-500">Loading scenario…</p>;
  if (error || !scenario)
    return <p className="text-red-500">Scenario not found.</p>;

  const steps = [...scenario.steps].sort(
    (a, b) => a.step_number - b.step_number,
  );

  return (
    <div className="space-y-6">
      <Link
        href="/scenarios"
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Back to Scenarios
      </Link>

      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">{scenario.name}</h1>
            {scenario.description && (
              <p className="text-sm text-gray-600">{scenario.description}</p>
            )}
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
              scenario.type === "multi_turn"
                ? "bg-indigo-100 text-indigo-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {scenario.type === "multi_turn" ? "Multi-turn" : "Single-turn"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Linked prompt</p>
            <p className="text-gray-800 font-medium">
              {prompt ? (
                <Link
                  href={`/prompts/${prompt.id}`}
                  className="text-indigo-600 hover:underline"
                >
                  {prompt.name}
                </Link>
              ) : (
                <span className="text-gray-400">#{scenario.prompt_id}</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Steps</p>
            <p className="text-gray-800 font-medium">{steps.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Created</p>
            <p className="text-gray-800">
              {new Date(scenario.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Updated</p>
            <p className="text-gray-800">
              {new Date(scenario.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {scenario.tags && scenario.tags.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-1.5">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {scenario.tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-700"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Steps */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Conversation Steps
        </h2>
        {steps.length === 0 ? (
          <p className="text-sm text-gray-500">No steps defined.</p>
        ) : (
          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.id}
                className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-semibold">
                    {step.step_number}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">
                    Step {step.step_number}
                  </span>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                    User message
                  </p>
                  <p className="text-sm text-gray-800 bg-gray-50 border border-gray-100 rounded p-3 whitespace-pre-wrap">
                    {step.user_message}
                  </p>
                </div>

                {step.expected_behavior && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                      Expected behavior
                    </p>
                    <p className="text-sm text-gray-700 italic">
                      {step.expected_behavior}
                    </p>
                  </div>
                )}

                {step.expected_keywords &&
                  step.expected_keywords.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                        Expected keywords
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {step.expected_keywords.map((kw) => (
                          <span
                            key={kw}
                            className="px-2 py-0.5 rounded bg-green-50 border border-green-200 text-xs text-green-800 font-mono"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {step.expected_format_regex && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                      Expected format regex
                    </p>
                    <code className="block text-xs bg-gray-900 text-gray-100 rounded px-3 py-2 font-mono overflow-x-auto">
                      {step.expected_format_regex}
                    </code>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
