import { FileText, FlaskConical, Activity, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Overview of your prompt testing and evaluation activity
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Prompts"    value="—" Icon={FileText}    bg="bg-indigo-50"  fg="text-indigo-600"  />
        <StatCard label="Test Cases"       value="—" Icon={FlaskConical} bg="bg-violet-50" fg="text-violet-600"  />
        <StatCard label="Evaluations Run"  value="—" Icon={Activity}    bg="bg-blue-50"    fg="text-blue-600"   />
        <StatCard label="Avg. Judge Score" value="—" Icon={TrendingUp}  bg="bg-emerald-50" fg="text-emerald-600" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <QuickAction href="/prompts"     title="Manage Prompts"  description="Create prompts, track versions, and view history."                        Icon={FileText}    />
        <QuickAction href="/scenarios"   title="Build Scenarios" description="Design single-turn and multi-turn test cases."                            Icon={FlaskConical} />
        <QuickAction href="/evaluations" title="Run Evaluations" description="Execute tests and get rule-based + LLM-as-a-Judge scores."                Icon={Activity}    />
      </div>
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex gap-4 items-start">
        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <TrendingUp size={15} className="text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-indigo-900">Live metrics</p>
          <p className="text-xs text-indigo-600 mt-0.5 leading-relaxed">
            Dashboard stats will populate automatically once you create prompts and run evaluations.
            Full chart visualisation arrives in the <span className="font-medium">feature/dashboard</span> sprint.
          </p>
        </div>
      </div>
    </div>
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