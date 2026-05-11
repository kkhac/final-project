export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      {/* TODO (Week 3, feature/dashboard): add stats cards, charts, recent runs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Prompts" value="—" />
        <StatCard label="Test Cases" value="—" />
        <StatCard label="Last Run Score" value="—" />
      </div>
      <p className="mt-8 text-gray-400 text-sm">
        Dashboard will be populated in Week 3 (feature/dashboard branch).
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-semibold mt-1">{value}</p>
    </div>
  );
}
