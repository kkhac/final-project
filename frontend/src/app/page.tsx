"use client";
import { FileText, FlaskConical, Activity, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { promptsApi, testCasesApi, evaluationsApi } from "@/lib/api";

export default function DashboardPage() {
  const { data: prompts = [] } = useQuery({
    queryKey: ["prompts"],
    queryFn: () => promptsApi.list().then(r => r.data),
  });
  const { data: testCases = [] } = useQuery({
    queryKey: ["test-cases"],
    queryFn: () => testCasesApi.list().then(r => r.data),
  });
  const { data: runs = [] } = useQuery({
    queryKey: ["evaluations"],
    queryFn: () => evaluationsApi.list().then(r => r.data),
  });

  const scoredRuns = runs.filter(r => r.status === "completed" && r.overall_score !== null);
  const avgScore = scoredRuns.length > 0
    ? scoredRuns.reduce((sum, r) => sum + (r.overall_score ?? 0), 0) / scoredRuns.length
    : null;

  const recentRuns = [...runs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Overview of your prompt testing and evaluation activity
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Prompts"    value={String(prompts.length)}  Icon={FileText}     bg="bg-indigo-50"  fg="text-indigo-600"  />
        <StatCard label="Test Cases"       value={String(testCases.length)} Icon={FlaskConical} bg="bg-violet-50"  fg="text-violet-600"  />
        <StatCard label="Evaluations Run"  value={String(runs.length)}     Icon={Activity}     bg="bg-blue-50"    fg="text-blue-600"    />
        <StatCard label="Avg. Judge Score" value={avgScore !== null ? avgScore.toFixed(2) : "—"} Icon={TrendingUp} bg="bg-emerald-50" fg="text-emerald-600" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <QuickAction href="/prompts"     title="Manage Prompts"  description="Create prompts, track versions, and view history."                    Icon={FileText}    />
        <QuickAction href="/scenarios"   title="Build Scenarios" description="Design single-turn and multi-turn test cases."                        Icon={FlaskConical} />
        <QuickAction href="/evaluations" title="Run Evaluations" description="Execute tests and get rule-based + LLM-as-a-Judge scores."            Icon={Activity}    />
      </div>

      {/* Recent runs table */}
      {recentRuns.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Recent Evaluation Runs</h2>
            <Link href="/evaluations" className="text-xs text-indigo-600 hover:underline">Run new →</Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {["Run", "Model", "Status", "Score", "Date"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentRuns.map(run => (
                <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-700">#{run.id}</td>
                  <td className="px-5 py-3 text-gray-600 text-xs">{run.model_provider} / {run.model_name}</td>
                  <td className="px-5 py-3"><StatusPill status={run.status} /></td>
                  <td className="px-5 py-3 text-gray-700">
                    {run.overall_score !== null ? run.overall_score.toFixed(2) : "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(run.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex gap-4 items-start">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp size={15} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-900">Getting started</p>
            <p className="text-xs text-indigo-600 mt-0.5 leading-relaxed">
              Create a prompt, build a test case, then run your first evaluation — stats and run history will appear here automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
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

function StatCard({ label, value, Icon, bg, fg }: {
  label: string; value: string; Icon: React.ElementType; bg: string; fg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon size={16} className={fg} />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function QuickAction({ href, title, description, Icon }: {
  href: string; title: string; description: string; Icon: React.ElementType;
}) {
  return (
    <Link href={href} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
          <Icon size={18} className="text-indigo-600" />
        </div>
        <ArrowRight size={16} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
      </div>
      <p className="font-semibold text-gray-800 text-sm mb-1">{title}</p>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </Link>
  );
}

function StatCard({ label, value, Icon, bg, fg }: { label: string; value: string; Icon: React.ElementType; bg: string; fg: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon size={16} className={fg} />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function QuickAction({ href, title, description, Icon }: { href: string; title: string; description: string; Icon: React.ElementType }) {
  return (
    <Link href={href} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
          <Icon size={18} className="text-indigo-600" />
        </div>
        <ArrowRight size={16} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
      </div>
      <p className="font-semibold text-gray-800 text-sm mb-1">{title}</p>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </Link>
  );
}