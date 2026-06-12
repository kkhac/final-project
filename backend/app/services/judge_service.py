"""
LLM-as-a-Judge service

Sends a completed LLM response to a judge model that scores it on a
0.0–1.0 scale and explains any failure. Uses the Provider Layer so the
judge itself can be OpenAI or Anthropic.
"""
import re
from typing import Optional

from app.services.providers import ChatMessage, ProviderError, get_provider

# Judge prompt

JUDGE_SYSTEM_PROMPT = """You are an expert evaluator for AI assistant responses.

You will receive:
1. SYSTEM PROMPT — the instructions given to the AI
2. USER MESSAGE — what the user asked
3. AI RESPONSE — what the AI replied
4. EXPECTED BEHAVIOR — what a correct response should do (may be empty)

Evaluate the AI response and reply in EXACTLY this format (no extra text):
SCORE: <number from 0.0 to 1.0>
CATEGORY: <one of: correct, format_error, context_loss, hallucination, off_topic, incomplete, instruction_ignored>
REASONING: <one sentence explaining the score>

Scoring guide:
1.0 — perfect: accurate, follows all instructions, appropriate tone
0.7 — good: mostly correct with minor issues
0.4 — partial: some correct elements but significant problems
0.1 — poor: mostly wrong or ignores instructions
0.0 — fail: completely wrong, harmful, or empty
"""

# Public API

def judge_response(
    *,
    system_prompt: str,
    user_message: str,
    llm_response: str,
    expected_behavior: Optional[str] = None,
    judge_provider: str = "anthropic",
    judge_model: str = "claude-3-5-haiku-20241022",
) -> dict:
    """
    Score one LLM response.

    Returns a dict with keys:
        score       float  0.0–1.0
        category    str    failure category label
        reasoning   str    one-sentence explanation
        raw_output  str    full judge reply (for debugging)
    """

    user_content = (
        f"SYSTEM PROMPT:\n{system_prompt}\n\n"
        f"USER MESSAGE:\n{user_message}\n\n"
        f"AI RESPONSE:\n{llm_response}\n\n"
        f"EXPECTED BEHAVIOR:\n{expected_behavior or 'Not specified'}"
    )

    try:
        provider = get_provider(judge_provider)
        resp = provider.complete(
            system_prompt=JUDGE_SYSTEM_PROMPT,
            messages=[ChatMessage(role="user", content=user_content)],
            model=judge_model,
            temperature=0.0,
        )
        raw = resp.text
    except ProviderError as exc:
        # If the judge itself fails, return a neutral score rather than crashing.
        return {
            "score": 0.5,
            "category": "judge_unavailable",
            "reasoning": f"Judge could not be reached: {exc}",
            "raw_output": "",
        }

    return _parse_judge_output(raw)


# Parsing

def _parse_judge_output(raw: str) -> dict:
    """
    Extract SCORE / CATEGORY / REASONING from the judge's reply.
    Falls back to safe defaults if the format is unexpected.
    """
    score_match = re.search(r"SCORE:\s*(-?[\d.]+)", raw)
    category_match = re.search(r"CATEGORY:\s*(\w+)", raw)
    reasoning_match = re.search(r"REASONING:\s*(.+)", raw)

    raw_score = float(score_match.group(1)) if score_match else 0.5
    score = max(0.0, min(1.0, raw_score))  # clamp to [0, 1]

    return {
        "score": score,
        "category": category_match.group(1).lower() if category_match else "unknown",
        "reasoning": reasoning_match.group(1).strip() if reasoning_match else raw[:200],
        "raw_output": raw,
    }


# Failure analysis helper

FAILURE_THRESHOLD = 0.5  # scores below this are treated as failures

def is_regression(old_score: float, new_score: float, threshold: float = 0.1) -> bool:
    """Returns True if the new score dropped significantly vs the old one."""
    return (old_score - new_score) >= threshold