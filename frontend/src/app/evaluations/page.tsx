import { EvaluationRunner } from "@/components/evaluations/EvaluationRunner";

export default function EvaluationsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Evaluation Runner</h1>
      <p className="text-gray-500 mb-6">
        Select a prompt version and test case, choose a model, and run an evaluation.
        Results with LLM judge scores appear live below.
      </p>
      <EvaluationRunner />
    </div>
  );
}
