"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { promptsApi } from "@/lib/api";

export function PromptList() {
  const qc = useQueryClient();
  const { data: prompts = [], isLoading } = useQuery({
    queryKey: ["prompts"],
    queryFn: () => promptsApi.list().then(r => r.data),
  });

  const del = useMutation({
    mutationFn: (id: number) => promptsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prompts"] }),
  });

  if (isLoading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="space-y-3">
      {prompts.length === 0 && (
        <p className="text-gray-400 text-sm">No prompts yet. Create one above.</p>
      )}
      {prompts.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
        >
          <div>
            <Link
              href={`/prompts/${p.id}`}
              className="font-medium text-blue-600 hover:underline"
            >
              {p.name}
            </Link>
            {p.description && (
              <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              {p.versions?.length ?? 0} version(s)
            </p>
          </div>
          <button
            onClick={() => del.mutate(p.id)}
            className="text-xs text-red-400 hover:text-red-600"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}