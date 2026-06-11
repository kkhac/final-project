"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { promptsApi, testCasesApi, evaluationsApi } from "@/lib/api";
import type { EvaluationRun } from "@/lib/api";

const PROVIDERS = ["openai", "anthropic"] as const;
type Provider = typeof PROVIDERS[number];
const MODELS: Record<Provider, string[]> = {
  openai: ["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
  anthropic: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-3-haiku-20240307"],
};

function StatusBadge({ status, score }: { status: string; score: number | null }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    running: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-800"}`}>
      {status === "running" && <span className="animate-spin inline-block">⟳</span>}
      {status}
      {status === "completed" && score !== null && ` · score: ${score.toFixed(2)}`}
    </span>
  );
}

function ResultCard({ result }: { result: EvaluationRun["results"][0] }) {
  const [expanded, setExpanded] = useState(false);
  const response = result.llm_response ?? "";

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Step {result.step_number}</span>
        <div className="flex items-center gap-1.5">
          {result.keyword_check_passed !== null && (
            <span className={`text-xs px-2 py-0.5 rounded ${result.keyword_check_passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              keywords {result.keyword_check_passed ? "✓" : "✗"}
            </span>
          )}
          {result.format_check_passed !== null && (
            <span className={`text-xs px-2 py-0.5 rounded ${result.format_check_passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              format {result.format_check_passed ? "✓" : "✗"}
            </span>
          )}
          {result.judge_score !== null && (
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">
              judge: {result.judge_score.toFixed(2)}
            </span>
          )}
          {result.score !== null && (
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
              score: {result.score?.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {response && (
        <div>
          <p className="text-xs text-gray-500 mb-1">LLM Response:</p>
          <div className="bg-gray-50 rounded p-2 text-xs text-gray-700 font-mono whitespace-pre-wrap">
            {expanded ? response : response.slice(0, 250)}
            {response.length > 250 && (
              <button onClick={() => setExpanded(!expanded)} className="ml-1 text-indigo-600 underline">
                {expanded ? "show less" : "show more"}
              </button>
            )}
          </div>
        </div>
      )}

      {result.judge_reasoning && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Judge reasoning:</p>
          <p className="text-xs text-gray-600 italic bg-indigo-50 rounded p-2">{result.judge_reasoning}</p>
        </div>
      )}

      {result.failure_reason && (
        <div className="bg-red-50 border border-red-200 rounded p-2">
          <p className="text-xs font-semibold text-red-700">
            ✗ {result.failure_category ? `[${result.failure_category}] ` : ""}{result.failure_reason}
          </p>
        </div>
      )}
    </div>
  );
}

export function EvaluationRunner() {
  const [promptId, setPromptId] = useState<number | null>(null);
  const [versionId, setVersionId] = useState<number | null>(null);
  const [testCaseId, setTestCaseId] = useState<number | null>(null);
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState<string>(MODELS.openai[0]);
  const [runId, setRunId] = useState<number | null>(null);
  const [polling, setPolling] = useState(false);

  const { data: prompts = [] } = useQuery({
    queryKey: ["prompts"],
    queryFn: () => promptsApi.list().then(r => r.data),
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["versions", promptId],
    queryFn: () => promptsApi.listVersions(promptId!).then(r => r.data),
    enabled: !!promptId,
  });

  const { data: testCases = [] } = useQuery({
    queryKey: ["test-cases"],
    queryFn: () => testCasesApi.list().then(r => r.data),
  });

  const { data: run } = useQuery({
    queryKey: ["run", runId],
    queryFn: () => evaluationsApi.get(runId!).then(r => r.data),
    enabled: !!runId,
    refetchInterval: polling ? 1500 : false,
  });

  useEffect(() => {
    if (run?.status === "completed" || run?.status === "failed") {
      setPolling(false);
    }
  }, [run?.status]);

  const mutation = useMutation({
    mutationFn: () =>
      evaluationsApi.trigger({
        prompt_version_id: versionId!,
        test_case_id: testCaseId!,
        model_provider: provider,
        model_name: model,
      }).then(r => r.data),
    onSuccess: (data) => {
      setRunId(data.id);
      setPolling(true);
    },
  });

  const canRun = !!versionId && !!testCaseId;

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Configure Run</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Prompt</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={promptId ?? ""}
              onChange={e => {
                const val = Number(e.target.value) || null;
                setPromptId(val);
                setVersionId(null);
              }}
            >
              <option value="">Select prompt…</option>
              {prompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Version</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={versionId ?? ""}
              onChange={e => setVersionId(Number(e.target.value) || null)}
              disabled={!promptId}
            >
              <option value="">Select version…</option>
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  v{v.version_number}{v.notes ? ` — ${v.notes}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Test Case</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={testCaseId ?? ""}
              onChange={e => setTestCaseId(Number(e.target.value) || null)}
            >
              <option value="">Select test case…</option>
              {testCases.map(tc => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Provider</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={provider}
              onChange={e => {
                const p = e.target.value as Provider;
                setProvider(p);
                setModel(MODELS[p][0]);
              }}
            >
              {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Model</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={model}
              onChange={e => setModel(e.target.value)}
            >
              {MODELS[provider].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => mutation.mutate()}
            disabled={!canRun || mutation.isPending || polling}
            className="bg-indigo-600 text-white px-6 py-2 rounded text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? "Starting…" : polling ? "Running…" : "▶  Run Evaluation"}
          </button>
          {!canRun && (
            <span className="text-xs text-gray-400">Select a version and test case to run</span>
          )}
          {mutation.isError && (
            <span className="text-xs text-red-600">Failed to start. Is the backend running?</span>
          )}
        </div>
      </div>

      {/* Live results */}
      {run && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Run #{run.id} — {run.model_provider} / {run.model_name}
            </h2>
            <StatusBadge status={run.status} score={run.overall_score} />
          </div>

          {(run.status === "pending" || run.status === "running") && (
            <p className="text-sm text-blue-600 animate-pulse mb-4">
              Evaluation in progress — auto-refreshing…
            </p>
          )}

          {run.results.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Step results:</p>
              {run.results.map(r => <ResultCard key={r.id} result={r} />)}
            </div>
          )}

          {run.status === "failed" && (
            <p className="text-sm text-red-600 mt-2">
              Evaluation failed. Check that your API keys are set and the backend is running.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
