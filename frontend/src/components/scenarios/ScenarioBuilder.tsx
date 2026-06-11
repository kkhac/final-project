"use client";
import { useState } from "react";

type ScenarioType = "single_turn" | "multi_turn";

interface ScenarioBuilderProps {
  onCancel: () => void;
}

export function ScenarioBuilder({ onCancel }: ScenarioBuilderProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ScenarioType>("single_turn");

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
        <label className="block text-xs text-gray-500 mb-1">Type</label>
        <select
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
          value={type}
          onChange={(e) => setType(e.target.value as ScenarioType)}
        >
          <option value="single_turn">Single turn</option>
          <option value="multi_turn">Multi turn</option>
        </select>
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
