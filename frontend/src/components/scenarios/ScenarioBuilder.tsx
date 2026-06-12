"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { promptsApi } from "@/lib/api";
import { ConversationStepRow, type StepDraft } from "./ConversationStepRow";

type ScenarioType = "single_turn" | "multi_turn";

interface ScenarioBuilderProps {
  onCancel: () => void;
}

const emptyStep = (step_number: number): StepDraft => ({
  step_number,
  user_message: "",
  expected_behavior: "",
  expected_keywords: "",
  expected_format_regex: "",
});

export function ScenarioBuilder({ onCancel }: ScenarioBuilderProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ScenarioType>("single_turn");
  const [promptId, setPromptId] = useState<number | "">("");
  const [steps, setSteps] = useState<StepDraft[]>([emptyStep(1)]);

  const updateStep = (idx: number, patch: Partial<StepDraft>) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    );
  };

  const addStep = () => {
    setSteps((prev) => [...prev, emptyStep(prev.length + 1)]);
  };

  const removeStep = (idx: number) => {
    setSteps((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, step_number: i + 1 }))
    );
  };

  const changeType = (next: ScenarioType) => {
    setType(next);
    if (next === "single_turn") {
      setSteps((prev) => prev.slice(0, 1));
    }
  };

  const isMulti = type === "multi_turn";

  const { data: prompts = [], isLoading: promptsLoading } = useQuery({
    queryKey: ["prompts"],
    queryFn: () => promptsApi.list().then((r) => r.data),
  });

  return (
    <div className="mb-6 bg-white border border-indigo-200 rounded-xl p-5 shadow-sm space-y-4">
      <h2 className="font-semibold text-gray-700">New Scenario</h2>

      <input
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        placeholder="Name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div>
        <label className="block text-xs text-gray-500 mb-1">Prompt *</label>
        <select
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white disabled:bg-gray-50"
          value={promptId}
          onChange={(e) => setPromptId(e.target.value ? Number(e.target.value) : "")}
          disabled={promptsLoading}
        >
          <option value="">
            {promptsLoading ? "Loading prompts…" : "Select a prompt"}
          </option>
          {prompts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Type</label>
        <select
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
          value={type}
          onChange={(e) => changeType(e.target.value as ScenarioType)}
        >
          <option value="single_turn">Single turn</option>
          <option value="multi_turn">Multi turn</option>
        </select>
      </div>

      <div className="space-y-3">
        <label className="block text-xs text-gray-500">
          {isMulti ? "Conversation steps" : "User message"}
        </label>
        {steps.map((step, idx) => (
          <ConversationStepRow
            key={idx}
            step={step}
            onChange={(patch) => updateStep(idx, patch)}
            onRemove={isMulti && steps.length > 1 ? () => removeStep(idx) : undefined}
          />
        ))}
        {isMulti && (
          <button
            type="button"
            onClick={addStep}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            + Add step
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button
          disabled
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Create
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
