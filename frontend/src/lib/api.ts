import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// ---- Types (mirrors backend Pydantic schemas) ----

export interface Prompt {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  versions: PromptVersion[];
}

export interface PromptVersion {
  id: number;
  prompt_id: number;
  version_number: number;
  system_prompt: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TestCase {
  id: number;
  prompt_id: number;
  name: string;
  description: string | null;
  type: "single_turn" | "multi_turn";
  tags: string[];
  steps: ConversationStep[];
  created_at: string;
  updated_at: string;
}

export interface ConversationStep {
  id: number;
  step_number: number;
  user_message: string;
  expected_behavior: string | null;
  expected_keywords: string[];
  expected_format_regex: string | null;
}

export interface EvaluationRun {
  id: number;
  prompt_version_id: number;
  test_case_id: number;
  model_provider: string;
  model_name: string;
  status: "pending" | "running" | "completed" | "failed";
  overall_score: number | null;
  results: EvaluationResult[];
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface EvaluationResult {
  id: number;
  step_number: number;
  llm_response: string | null;
  keyword_check_passed: boolean | null;
  format_check_passed: boolean | null;
  judge_score: number | null;
  judge_reasoning: string | null;
  failure_reason: string | null;
  failure_category: string | null;
  score: number | null;
}

// ---- API helpers ----

export const promptsApi = {
  list: () => api.get<Prompt[]>("/prompts/"),
  get: (id: number) => api.get<Prompt>(`/prompts/${id}`),
  create: (data: { name: string; description?: string; system_prompt: string }) =>
    api.post<Prompt>("/prompts/", data),
  update: (id: number, data: { name?: string; description?: string }) =>
    api.patch<Prompt>(`/prompts/${id}`, data),
  delete: (id: number) => api.delete(`/prompts/${id}`),
  createVersion: (id: number, data: { system_prompt: string; notes?: string }) =>
    api.post<PromptVersion>(`/prompts/${id}/versions`, data),
  listVersions: (id: number) =>
    api.get<PromptVersion[]>(`/prompts/${id}/versions`),
  getVersion: (id: number, versionId: number) =>
    api.get<PromptVersion>(`/prompts/${id}/versions/${versionId}`),
  compare: (promptId: number, v1: number, v2: number) =>
    api.get<{ version_a: PromptVersion; version_b: PromptVersion }>(
      `/prompts/${promptId}/versions/compare?v1=${v1}&v2=${v2}`
    ),
};

export const testCasesApi = {
  list: (promptId?: number) =>
    api.get<TestCase[]>("/test-cases/", { params: { prompt_id: promptId } }),
  get: (id: number) => api.get<TestCase>(`/test-cases/${id}`),
  create: (data: Omit<TestCase, "id" | "created_at" | "updated_at">) =>
    api.post<TestCase>("/test-cases/", data),
  delete: (id: number) => api.delete(`/test-cases/${id}`),
};

export interface DashboardStats {
  total_prompts: number;
  total_test_cases: number;
  total_runs: number;
  avg_score: number | null;
}

export interface RecentRun {
  id: number;
  prompt_name: string;
  test_case_name: string;
  model_provider: string;
  model_name: string;
  status: "pending" | "running" | "completed" | "failed";
  overall_score: number | null;
  created_at: string;
}

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>("/dashboard/stats"),
  getRecentRuns: (limit = 10) =>
    api.get<RecentRun[]>("/dashboard/recent-runs", { params: { limit } }),
};

export const evaluationsApi = {
  trigger: (data: {
    prompt_version_id: number;
    test_case_id: number;
    model_provider: string;
    model_name: string;
  }) => api.post<EvaluationRun>("/evaluations/", data),
  list: (promptVersionId?: number) =>
    api.get<EvaluationRun[]>("/evaluations/", { params: { prompt_version_id: promptVersionId } }),
  get: (id: number) => api.get<EvaluationRun>(`/evaluations/${id}`),
  getHistory: (promptId: number) => api.get<EvaluationRun[]>(`/evaluations/history/${promptId}`),
};
