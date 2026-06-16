"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, promptsApi, testCasesApi } from "@/lib/api";
import type { ConversationStep } from "@/lib/api";

interface EvaluationResult {
  id: number;
  step_number: number;
  llm_response: string | null;
  keyword_check_passed: boolean | null;
  format_check_passed: boolean | null;
  rule_details: Record<string, unknown>;
  judge_score: number | null;
  judge_reasoning: string | null;
  failure_reason: string | null;
  failure_category: string | null;
  score: number | null;
  created_at: string;
}

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
  results: EvaluationResult[];
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-sm">—</span>;
  const pct = Math.round(score * 100);
  const color =
    pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-gray-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-mono font-semibold">{pct}%</span>
    </div>
  );
}

function Check({ passed }: { passed: boolean | null }) {
  if (passed === null)
    return <span className="text-gray-400 text-sm">—</span>;
  return passed ? (
    <span className="text-green-600 font-bold">✓</span>
  ) : (
    <span className="text-red-500 font-bold">✗</span>
  );
}

function RuleBadge({
  label,
  passed,
  children,
}: {
  label: string;
  passed: boolean | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-sm transition-colors ${
          open ? "bg-gray-100" : "hover:bg-gray-50"
        }`}
      >
        <Check passed={passed} />
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-300 text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 left-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-left">
          {children}
        </div>
      )}
    </div>
  );
}

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: run, isLoading, error } = useQuery<EvaluationRun>({
    queryKey: ["run", id],
    queryFn: () => api.get(`/evaluations/${id}`).then((r) => r.data),
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "running" || s === "pending" ? 2000 : false;
    },
  });

  const { data: testCase } = useQuery({
    queryKey: ["test-case", run?.test_case_id],
    queryFn: () => testCasesApi.get(run!.test_case_id).then((r) => r.data),
    enabled: !!run?.test_case_id,
  });

  const { data: prompt } = useQuery({
    queryKey: ["prompt", testCase?.prompt_id],
    queryFn: () => promptsApi.get(testCase!.prompt_id).then((r) => r.data),
    enabled: !!testCase?.prompt_id,
  });

  const stepLookup = new Map<number, ConversationStep>(
    (testCase?.steps ?? []).map((s) => [s.step_number, s]),
  );

  const versionNumber = prompt?.versions.find(
    (v) => v.id === run?.prompt_version_id,
  )?.version_number;

  if (isLoading)
    return <div className="p-8 text-gray-500">Loading run…</div>;
  if (error || !run)
    return <div className="p-8 text-red-500">Run not found.</div>;

  const duration =
    run.started_at && run.finished_at
      ? `${(
          (new Date(run.finished_at).getTime() -
            new Date(run.started_at).getTime()) /
          1000
        ).toFixed(1)}s`
      : null;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/runs" className="text-sm text-indigo-600 hover:underline">
        ← Back to Runs
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Run #{run.id}</h1>
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-mono">{run.model_name}</span>
              <span className="text-gray-400"> ({run.model_provider})</span>
            </p>
            <div className="text-sm text-gray-600 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              {prompt ? (
                <>
                  <Link
                    href={`/prompts/${prompt.id}`}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    {prompt.name}
                  </Link>
                  {versionNumber !== undefined && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-xs">
                      v{versionNumber}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-gray-400">Prompt version #{run.prompt_version_id}</span>
              )}
              <span className="text-gray-300">·</span>
              {testCase ? (
                <Link
                  href={`/scenarios/${testCase.id}`}
                  className="text-indigo-600 hover:underline"
                >
                  {testCase.name}
                </Link>
              ) : (
                <span className="text-gray-400">Test case #{run.test_case_id}</span>
              )}
            </div>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${STATUS_STYLES[run.status]}`}
          >
            {run.status}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-8">
          <div>
            <p className="text-xs text-gray-400 mb-1">Overall score</p>
            <ScoreBar score={run.overall_score} />
          </div>
          {duration && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Duration</p>
              <p className="text-sm font-mono">{duration}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 mb-1">Created</p>
            <p className="text-sm">{new Date(run.created_at).toLocaleString()}</p>
          </div>
        </div>

        {run.error_message && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <strong>Error:</strong> {run.error_message}
          </div>
        )}
      </div>

      {/* Steps */}
      {run.results.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {run.status === "running" || run.status === "pending"
            ? "Run in progress…"
            : "No results recorded."}
        </p>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Steps ({run.results.length})
          </h2>
          {[...run.results]
            .sort((a, b) => a.step_number - b.step_number)
            .map((result) => (
              <div
                key={result.id}
                className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
              >
                {/* Step header */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    Step {result.step_number}
                  </span>
                  <ScoreBar score={result.score} />
                </div>

                {/* LLM Response */}
                {result.llm_response && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">LLM Response</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded p-3 border border-gray-100">
                      {result.llm_response}
                    </p>
                  </div>
                )}

                {/* Check row */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <RuleBadge label="Keywords" passed={result.keyword_check_passed}>
                    {(() => {
                      const kws =
                        stepLookup.get(result.step_number)?.expected_keywords ?? [];
                      if (kws.length === 0)
                        return (
                          <p className="text-xs text-gray-500">
                            No keywords were expected for this step.
                          </p>
                        );
                      const details = (result.rule_details ?? {}) as {
                        matched_keywords?: string[];
                        missing_keywords?: string[];
                      };
                      const matchedSet = new Set(
                        (details.matched_keywords ?? []).map((k) => k.toLowerCase()),
                      );
                      const haveDetails =
                        Array.isArray(details.matched_keywords) ||
                        Array.isArray(details.missing_keywords);
                      const response = (result.llm_response ?? "").toLowerCase();
                      const isMatched = (kw: string) =>
                        haveDetails
                          ? matchedSet.has(kw.toLowerCase())
                          : response.includes(kw.toLowerCase());
                      return (
                        <>
                          <p className="text-xs text-gray-500 mb-2">
                            Expected keywords (
                            <span className="text-green-700">green = found</span>,{" "}
                            <span className="text-red-600">red = missing</span>):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {kws.map((kw) => {
                              const ok = isMatched(kw);
                              return (
                                <span
                                  key={kw}
                                  className={`px-2 py-0.5 rounded text-xs font-mono border ${
                                    ok
                                      ? "bg-green-50 border-green-200 text-green-800"
                                      : "bg-red-50 border-red-200 text-red-700"
                                  }`}
                                >
                                  {kw}
                                </span>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </RuleBadge>

                  <RuleBadge label="Format" passed={result.format_check_passed}>
                    {(() => {
                      const regex =
                        stepLookup.get(result.step_number)?.expected_format_regex;
                      if (!regex)
                        return (
                          <p className="text-xs text-gray-500">
                            No format regex was expected for this step.
                          </p>
                        );
                      return (
                        <>
                          <p className="text-xs text-gray-500 mb-2">
                            Expected format regex:
                          </p>
                          <code className="block text-xs bg-gray-900 text-gray-100 rounded px-2 py-1.5 font-mono break-all whitespace-pre-wrap">
                            {regex}
                          </code>
                        </>
                      );
                    })()}
                  </RuleBadge>

                  {result.judge_score !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Judge:</span>
                      <ScoreBar score={result.judge_score} />
                    </div>
                  )}
                </div>

                {/* Judge reasoning */}
                {result.judge_reasoning && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Judge Reasoning</p>
                    <p className="text-sm text-gray-600 italic">
                      {result.judge_reasoning}
                    </p>
                  </div>
                )}

                {/* Failure block */}
                {result.failure_category && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded text-sm">
                    <span className="font-medium text-red-700 capitalize">
                      {result.failure_category}
                    </span>
                    {result.failure_reason && (
                      <p className="text-red-600 mt-0.5">
                        {result.failure_reason}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
