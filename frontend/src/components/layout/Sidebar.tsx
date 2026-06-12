"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, FlaskConical, BarChart3, Zap, List } from "lucide-react";

const nav = [
  { href: "/",            icon: LayoutDashboard, label: "Dashboard"   },
  { href: "/prompts",     icon: FileText,        label: "Prompts"     },
  { href: "/scenarios",   icon: FlaskConical,    label: "Scenarios"   },
  { href: "/evaluations", icon: BarChart3,       label: "Evaluations" },
  { href: "/runs",        icon: List,            label: "Runs"        },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-slate-900 flex flex-col z-10">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap size={15} className="text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-white font-semibold text-sm">PromptTest</p>
            <p className="text-slate-400 text-xs">Regression Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-slate-700">
        <p className="text-slate-600 text-xs text-center">v1.0 · MVP</p>
      </div>
    </aside>
  );
}