"use client";
import { useState } from "react";
import { ScenarioBuilder } from "@/components/scenarios/ScenarioBuilder";

export default function ScenariosPage() {
  const [building, setBuilding] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Test Scenarios</h1>
        {!building && (
          <button
            onClick={() => setBuilding(true)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            + New Scenario
          </button>
        )}
      </div>

      {building ? (
        <ScenarioBuilder onCancel={() => setBuilding(false)} />
      ) : (
        <p className="text-gray-400 text-sm">No scenarios yet. Click “+ New Scenario” to start.</p>
      )}
    </div>
  );
}
