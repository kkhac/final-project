# კვირა 6 — ობიექტების მოდელირება, ER დიაგრამა და API კონტრაქტი

**პროექტი:** LLM Prompt and Conversational Regression Testing Platform  
**ავტორი:** ბარბარე ჯანაშვილი  
**მოდული:** Prompt Management და Evaluation

---

## 1. მიზანი

წინამდებარე დოკუმენტი აღწერს Prompt Management და Evaluation მოდულების მონაცემთა მოდელებს, ობიექტებს შორის კავშირებს და API კონტრაქტებს. იგი ასახავს კვირა 6-ში მიღებულ არქიტექტურულ გადაწყვეტილებებს, რომლებიც კვირა 7-სა და შემდეგ კვირებში განხორციელდა.

---

## 2. ობიექტების მოდელები

### 2.1 Prompt (პრომპტი)

წარმოადგენს დასახელებულ სისტემურ პრომპტს ვერსიების სრული ისტორიით.

| ველი | ტიპი | შეზღუდვები | აღწერა |
|------|------|-----------|--------|
| `id` | Integer | PK, auto | უნიკალური იდენტიფიკატორი |
| `name` | String(255) | NOT NULL | ადამიანისთვის გასაგები პრომპტის სახელი |
| `description` | Text | nullable | სურვილისამებრ აღწერა |
| `created_at` | DateTime | default=now | შექმნის თარიღი |
| `updated_at` | DateTime | default=now, onupdate | ბოლო განახლების თარიღი |

**გამოთვლილი თვისება:** `latest_version` — აბრუნებს `PromptVersion`-ს ყველაზე მაღალი `version_number`-ით.

**კავშირები:**
- `versions` → ერთი-მრავალთან კავშირი `PromptVersion`-თან (cascade delete)
- `test_cases` → ერთი-მრავალთან კავშირი `TestCase`-თან (cascade delete)

---

### 2.2 PromptVersion (პრომპტის ვერსია)

წარმოადგენს სისტემური პრომპტის ტექსტის ერთ უცვლელ სნეფშოტს.

| ველი | ტიპი | შეზღუდვები | აღწერა |
|------|------|-----------|--------|
| `id` | Integer | PK, auto | უნიკალური იდენტიფიკატორი |
| `prompt_id` | Integer | FK → Prompt.id, NOT NULL | მშობელი პრომპტი |
| `version_number` | Integer | NOT NULL | მზარდი ნუმერაცია პრომპტის ფარგლებში |
| `system_prompt` | Text | NOT NULL | სისტემური პრომპტის ფაქტობრივი ტექსტი |
| `notes` | Text | nullable | ცვლილების შენიშვნები / changelog |
| `is_active` | Boolean | default=True | გააქტიურების ლოგიკისთვის დარეზერვებული |
| `created_at` | DateTime | default=now | ვერსიის შექმნის თარიღი |

**კავშირები:**
- `prompt` → მრავალი-ერთთან კავშირი `Prompt`-თან
- `evaluation_runs` → ერთი-მრავალთან კავშირი `EvaluationRun`-თან

---

### 2.3 EvaluationRun (შეფასების გაშვება)

წარმოადგენს ტესტ-ქეისის ერთ შესრულებას კონკრეტული პრომპტის ვერსიაზე.

| ველი | ტიპი | შეზღუდვები | აღწერა |
|------|------|-----------|--------|
| `id` | Integer | PK, auto | უნიკალური იდენტიფიკატორი |
| `test_case_id` | Integer | FK → TestCase.id | გასაშვები ტესტ-ქეისი |
| `prompt_version_id` | Integer | FK → PromptVersion.id | სატესტო ვერსია |
| `model_provider` | String | NOT NULL | მაგ. `"openai"`, `"anthropic"` |
| `model_name` | String | NOT NULL | მაგ. `"gpt-4o"`, `"claude-3-5-sonnet"` |
| `status` | Enum | NOT NULL | `pending / running / completed / failed` |
| `started_at` | DateTime | nullable | შესრულების დაწყების დრო |
| `finished_at` | DateTime | nullable | შესრულების დასრულების დრო |
| `created_at` | DateTime | default=now | ჩანაწერის შექმნის დრო |

---

### 2.4 EvaluationResult (შეფასების შედეგი)

ინახავს შეფასების გაშვების ერთი ნაბიჯის შედეგს.

| ველი | ტიპი | შეზღუდვები | აღწერა |
|------|------|-----------|--------|
| `id` | Integer | PK, auto | უნიკალური იდენტიფიკატორი |
| `run_id` | Integer | FK → EvaluationRun.id | მშობელი გაშვება |
| `step_number` | Integer | NOT NULL | სცენარის რომელი ნაბიჯი |
| `llm_response` | Text | nullable | LLM-ის ნედლი გამოსავალი |
| `keyword_check_passed` | Boolean | nullable | საკვანძო სიტყვების შემოწმების შედეგი |
| `format_check_passed` | Boolean | nullable | Regex შემოწმების შედეგი |
| `rule_details` | JSON | nullable | `_rule_based_check()`-ის სრული გამოსავალი |
| `judge_score` | Float | nullable | LLM-as-a-Judge ქულა (კვირა 11) |
| `judge_reasoning` | Text | nullable | Judge-ის განმარტება (კვირა 11) |
| `score` | Float | nullable | კომპოზიტური ქულა (0.0–1.0) |

---

## 3. ER დიაგრამა

```
┌─────────────────┐         ┌──────────────────────┐
│     Prompt      │         │    PromptVersion      │
│─────────────────│         │──────────────────────│
│ id (PK)         │◄────────│ prompt_id (FK)        │
│ name            │  1   *  │ id (PK)               │
│ description     │         │ version_number        │
│ created_at      │         │ system_prompt         │
│ updated_at      │         │ notes                 │
└─────────────────┘         │ is_active             │
         │                  │ created_at            │
         │                  └──────────────────────┘
         │                            │
         │ 1                          │ 1
         │                            │
         ▼ *                          ▼ *
┌─────────────────┐         ┌──────────────────────┐
│    TestCase     │         │   EvaluationRun       │
│─────────────────│         │──────────────────────│
│ id (PK)         │◄────────│ test_case_id (FK)     │
│ prompt_id (FK)  │  1   *  │ id (PK)               │
│ title           │         │ prompt_version_id(FK) │
│ description     │         │ model_provider        │
│ steps           │         │ model_name            │
└─────────────────┘         │ status                │
                            │ started_at            │
                            │ finished_at           │
                            └──────────────────────┘
                                       │
                                       │ 1
                                       │
                                       ▼ *
                            ┌──────────────────────┐
                            │  EvaluationResult    │
                            │──────────────────────│
                            │ id (PK)              │
                            │ run_id (FK)          │
                            │ step_number          │
                            │ llm_response         │
                            │ keyword_check_passed │
                            │ format_check_passed  │
                            │ rule_details (JSON)  │
                            │ judge_score          │
                            │ score                │
                            └──────────────────────┘
```

---

## 4. API კონტრაქტი

### პრომპტის Endpoint-ები

#### `POST /prompts/`
**მოთხოვნა:**
```json
{
  "name": "მომხმარებელთა მხარდაჭერის ბოტი",
  "description": "თანხის დაბრუნების მოთხოვნებს ამუშავებს",
  "system_prompt": "შენ ხარ თვინიერი მომხმარებელთა მხარდაჭერის აგენტი..."
}
```
**პასუხი `201`:**
```json
{
  "id": 1,
  "name": "მომხმარებელთა მხარდაჭერის ბოტი",
  "description": "თანხის დაბრუნების მოთხოვნებს ამუშავებს",
  "created_at": "2025-01-01T10:00:00",
  "updated_at": "2025-01-01T10:00:00",
  "versions": [
    {
      "id": 1,
      "prompt_id": 1,
      "version_number": 1,
      "system_prompt": "შენ ხარ თვინიერი მომხმარებელთა მხარდაჭერის აგენტი...",
      "notes": "Initial version",
      "is_active": true,
      "created_at": "2025-01-01T10:00:00"
    }
  ]
}
```

#### `POST /prompts/{id}/versions`
**მოთხოვნა:**
```json
{
  "system_prompt": "შენ ხარ ლაკონური და თვინიერი მხარდაჭერის აგენტი...",
  "notes": "ტონი უფრო ლაკონური გახდა"
}
```
**პასუხი `201`:** ერთი `PromptVersion` ობიექტი `version_number: 2`-ით.

#### `GET /prompts/{id}/versions`
**პასუხი `200`:** `PromptVersion` ობიექტების მასივი, `version_number ASC`-ით დალაგებული.

#### `PATCH /prompts/{id}`
**მოთხოვნა:** `{"name": "ახალი სახელი"}` (ყველა ველი)  
**პასუხი `200`:** განახლებული `Prompt` ობიექტი.

#### `DELETE /prompts/{id}`
**პასუხი `204`:** შიგთავსი არ არის.

#### `GET /prompts/{id}/versions/{version_id}`
**პასუხი `200`:** ერთი `PromptVersion`.  
**პასუხი `404`:** `{"detail": "Version not found"}` — თუ ვერსია ამ პრომპტს არ ეკუთვნის.

---

## 5. Rule-based შეფასების კონტრაქტი

`_rule_based_check()` ფუნქციის სიგნატურა და გამოსავალი წარმოადგენს შეფასების ძრავასა და შედეგების შენახვის ფენას შორის შიდა API-ს.

**შეყვანა:**
```python
def _rule_based_check(
    response: str,                 # LLM-ის ნედლი გამოსავალი
    expected_keywords: list[str],  # სავალდებულო საკვანძო სიტყვები
    regex_pattern: str | None,     # ოფშენალ სფორმატის Regex
) -> tuple[bool, bool, dict]:
    # აბრუნებს: (keyword_passed, format_passed, details_dict)
```

**გამოსავლის `details` სქემა:**
```json
{
  "expected_keywords": ["სიტყვა1", "სიტყვა2"],
  "matched_keywords": ["სიტყვა1"],
  "missing_keywords": ["სიტყვა2"],
  "empty_response": false,
  "regex_pattern": "pattern ან null",
  "regex_match": true
}
```

**სპეციალური შემთხვევა — ცარიელი პასუხი:**
```json
{
  "expected_keywords": ["გამარჯობა"],
  "matched_keywords": [],
  "missing_keywords": ["გამარჯობა"],
  "empty_response": true,
  "regex_pattern": null,
  "regex_match": false
}
```
აბრუნებს `(False, False, details)`.

---

## 6. ტექნოლოგიური გადაწყვეტილებები

| საკითხი | გადაწყვეტილება | დასაბუთება |
|---------|---------------|-----------|
| ORM | SQLAlchemy 2.0 | ინდუსტრიული სტანდარტი, მუშაობს SQLite-თანაც და PostgreSQL-თანაც |
| ვალიდაცია | Pydantic v2 | FastAPI-ს ნეიტივი, ავტომატური სქემის გენერაცია |
| DB (განვითარება) | SQLite | ნულოვანი კონფიგურაციით ლოკალური განვითარება |
| DB (პროდაქშენი) | PostgreSQL | კონკურენტული წვდომისა და სანდოობის მოთხოვნები |
| ვერსიონირების სტრატეგია | `max() + 1` | უსაფრთხოა ხარვეზების მიმართ; `len()` გაიტეხება ნებისმიერი წაშლის შემდეგ |
| Cascade | `cascade="all, delete-orphan"` | უზრუნველყოფს, რომ პრომპტის წაშლისას孤立ული ვერსიები არ დარჩება |
