"use client";

export interface StepDraft {
  step_number: number;
  user_message: string;
  expected_behavior: string;
  expected_keywords: string;
  expected_format_regex: string;
}

interface ConversationStepRowProps {
  step: StepDraft;
  onChange: (patch: Partial<StepDraft>) => void;
}

export function ConversationStepRow({ step, onChange }: ConversationStepRowProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          Step {step.step_number}
        </span>
      </div>

      <textarea
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono bg-white"
        rows={2}
        placeholder="User message *"
        value={step.user_message}
        onChange={(e) => onChange({ user_message: e.target.value })}
      />

      <input
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
        placeholder="Expected behavior (optional)"
        value={step.expected_behavior}
        onChange={(e) => onChange({ expected_behavior: e.target.value })}
      />

      <input
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
        placeholder="Expected keywords (comma-separated)"
        value={step.expected_keywords}
        onChange={(e) => onChange({ expected_keywords: e.target.value })}
      />

      <input
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono bg-white"
        placeholder="Expected format regex (optional)"
        value={step.expected_format_regex}
        onChange={(e) => onChange({ expected_format_regex: e.target.value })}
      />
    </div>
  );
}
