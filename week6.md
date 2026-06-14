## 2. სისტემის ლოგიკური არქიტექტურა

პლატფორმა აიგება **ხუთშრიანი (Layered)** არქიტექტურით. ეს მიდგომა უზრუნველყოფს ბიზნეს-ლოგიკის იზოლაციას LLM პროვაიდერებისგან.

```mermaid
flowchart TB
    subgraph UI["Presentation — Next.js / React"]
        SB[Scenario Builder]
        CONV[Conversations]
        DASH[Dashboard & Reports]
        PROV_UI[Providers]
    end

    subgraph API["Application — FastAPI"]
        SC_API[Scenario API]
        EX_API[Execution API]
        PR_API[Provider API]
    end

    subgraph Domain["Domain — ბიზნეს-ლოგიკა"]
        ORCH[Execution Orchestrator]
        VAL[Scenario Validator]
        EVAL[Evaluation Hook]
    end

    subgraph Adapters["Provider Abstraction — Adapter Pattern"]
        OAI[OpenAI Adapter]
        ANT[Anthropic Adapter]
        GEM[Gemini Adapter]
        LOC[Ollama / Custom Adapter]
    end

    subgraph Storage["Persistence"]
        PG[(PostgreSQL · prod)]
        SQ[(SQLite · dev)]
    end

    SB & CONV --> SC_API
    DASH --> EX_API
    PROV_UI --> PR_API
    SC_API --> VAL
    EX_API --> ORCH
    PR_API --> Adapters
    ORCH --> Adapters
    ORCH --> EVAL
    VAL & ORCH --> PG
    PG -. dev .-> SQ
    Adapters -.->|HTTP / local inference| LLM[(LLM მოდელები)]
```

---

## 3. ობიექტების მოდელი (Domain Model)

სისტემის მონაცემთა მოდელი აგებულია სამი ძირითადი სუბიექტის გარშემო: **Scenario**, **Provider** და **Execution**.

```mermaid
classDiagram
    class Scenario {
        +UUID id
        +str name
        +ScenarioType type
        +str system_prompt
        +List~Step~ steps
        +List~str~ tags
        +int version
        +datetime created_at
        +datetime updated_at
    }
    class ScenarioType {
        <<enumeration>>
        LINEAR
        CONTEXT_RETENTION
        GOAL_COMPLETION
        INSTRUCTION_ADHERENCE
    }
    class Step {
        +int order
        +StepMode mode
        +str user_input
        +str expected_behavior
        +Dict context_hints
    }
    class StepMode {
        <<enumeration>>
        SCRIPTED
        AI_SIMULATED
    }
    class Provider {
        +UUID id
        +str display_name
        +ProviderKind kind
        +str model_name
        +Dict generation_params
        +Dict api_config
    }
    class ProviderKind {
        <<enumeration>>
        CLOUD_OPENAI
        CLOUD_ANTHROPIC
        CLOUD_GEMINI
        LOCAL_OLLAMA
        CUSTOM_ENDPOINT
    }
    class Execution {
        +UUID id
        +UUID scenario_id
        +UUID provider_id
        +UUID judge_provider_id
        +ExecutionStatus status
        +Verdict verdict
        +float arc_score
        +float drift_score
        +datetime started_at
        +datetime finished_at
    }
    class ExecutionStatus {
        <<enumeration>>
        PENDING
        RUNNING
        SUCCEEDED
        FAILED
        ERRORED
    }
    class Verdict {
        <<enumeration>>
        PASS
        PARTIAL
        FAIL
        NOT_EVALUATED
    }
    class ExecutionStep {
        +UUID id
        +UUID execution_id
        +int step_order
        +str role
        +str model_response
        +float turn_score
        +Dict turn_metrics
        +int latency_ms
        +int prompt_tokens
        +int completion_tokens
    }

    Scenario "1" o-- "many" Step
    Scenario --> ScenarioType
    Step --> StepMode
    Provider --> ProviderKind
    Scenario "1" --> "many" Execution
    Provider "1" --> "many" Execution
    Execution --> ExecutionStatus
    Execution --> Verdict
    Execution "1" o-- "many" ExecutionStep
```

### 3.1. კომპონენტების აღწერა
*   **Scenario (სცენარი):** ტესტის აღწერა. მხარს უჭერს `SCRIPTED` (ფიქსირებული) და `AI_SIMULATED` (სიმულირებული მომხმარებელი) ნაბიჯებს.
*   **Provider (პროვაიდერი):** LLM ენდპოინტების აბსტრაქცია. ერთი გაშვებისას შეიძლება იყოს როგორც **Target** (ტესტირებადი), ისე **Judge** (შემფასებელი).
*   **Execution (შესრულება):** კონკრეტული ტესტ-გაშვების სრული ჩანაწერი. `arc_score` ზომავს კონვერსაციის ჯამურ ხარისხს, ხოლო `drift_score` — ხარისხის ვარდნას დროთა განმავლობაში.

---

## 4. მონაცემთა ბაზის სქემა (ERD)

```mermaid
erDiagram
    SCENARIO ||--o{ EXECUTION : "defines"
    PROVIDER ||--o{ EXECUTION : "target"
    PROVIDER ||--o{ EXECUTION : "judge"
    EXECUTION ||--o{ EXECUTION_STEP : "contains"

    SCENARIO {
        uuid id PK
        varchar name
        varchar type
        text system_prompt
        jsonb steps
        text_array tags
        int version
        boolean is_deleted
        timestamptz created_at
        timestamptz updated_at
    }

    PROVIDER {
        uuid id PK
        varchar display_name
        varchar kind
        varchar model_name
        jsonb generation_params
        jsonb api_config
        boolean is_active
        timestamptz created_at
    }

    EXECUTION {
        uuid id PK
        uuid scenario_id FK
        uuid provider_id FK
        uuid judge_provider_id FK
        varchar status
        varchar verdict
        float arc_score
        float drift_score
        timestamptz started_at
        timestamptz finished_at
        text error_message
    }

    EXECUTION_STEP {
        uuid id PK
        uuid execution_id FK
        int step_order
        varchar role
        text model_response
        float turn_score
        jsonb turn_metrics
        int latency_ms
        int prompt_tokens
        int completion_tokens
        jsonb eval_details
    }
```

---

## 5. API კონტრაქტი (Endpoints)

სისტემასთან ინტერაქცია ხდება RESTful API-ს მეშვეობით, რაც უზრუნველყოფს ტესტების ასინქრონულ მართვას.

1. Scenarios (სცენარები)
POST /scenarios — ახალი სატესტო სცენარის შექმნა.

GET /scenarios — ყველა სცენარის სია და ფილტრაცია.

GET /scenarios/{id} — კონკრეტული სცენარის სრული სტრუქტურა.

PUT /scenarios/{id} — სცენარის რედაქტირება (ახალი ვერსია).

DELETE /scenarios/{id} — სცენარის არქივაცია (Soft-delete).

2. Executions (ტესტების გაშვება)
POST /executions — ტესტირების პროცესის ინიციირება.

GET /executions/{id} — სტატუსის და arc/drift ქულების ნახვა.

GET /executions/{id}/steps — დიალოგის თითოეული ნაბიჯის დეტალები.

GET /executions — ჩატარებული ტესტების ისტორია.

3. Providers (პროვაიდერები)
POST /providers — ახალი LLM მოდელის რეგისტრაცია.

GET /providers — ხელმისაწვდომი მოდელების სია.

POST /providers/{id}/health — API კავშირის და სისწრაფის შემოწმება.

4. Analytics (ანალიტიკა)
GET /analytics/dashboard — წარმატების მაჩვენებლების ჯამური სტატისტიკა.