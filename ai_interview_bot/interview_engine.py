"""Interview question generation and adaptive follow-up engine."""

import json
import os
from typing import Any, Dict, List, Optional

try:
    from google import genai
    from google.genai import types
except ImportError:  # pragma: no cover - optional runtime import
    genai = None
    types = None


FALLBACK_HR_QUESTIONS: List[Dict[str, Any]] = [
    {
        "id": "hr-1",
        "topic": "HR",
        "prompt": "Tell me about yourself and what sparked your interest in this role.",
        "keywords": ["background", "project", "skills", "experience", "role"],
        "framework": "Present role/education -> key project impact -> target role fit.",
    },
    {
        "id": "hr-2",
        "topic": "HR",
        "prompt": "What are your greatest strengths and one area you are actively working to improve?",
        "keywords": ["strength", "weakness", "improve", "feedback", "habit"],
        "framework": "Evidence-backed strength + genuine improvement habit.",
    },
    {
        "id": "hr-3",
        "topic": "HR",
        "prompt": "Describe a difficult team disagreement and how you helped resolve it.",
        "keywords": ["team", "listen", "resolve", "compromise", "outcome"],
        "framework": "STAR method: Situation -> Task -> Action -> Measurable Result.",
    },
    {
        "id": "hr-4",
        "topic": "HR",
        "prompt": "Why should we hire you over other qualified candidates?",
        "keywords": ["skills", "ownership", "impact", "deliver", "learn"],
        "framework": "Connect top 2 strengths directly to the role's day-one needs.",
    },
    {
        "id": "hr-5",
        "topic": "HR",
        "prompt": "Tell me about a time you made a mistake and what you changed afterward.",
        "keywords": ["mistake", "accountability", "fix", "process", "learned"],
        "framework": "Own the mistake quickly -> explain fix -> preventive safeguard.",
    },
]

FALLBACK_TECHNICAL_QUESTIONS: List[Dict[str, Any]] = [
    {
        "id": "tech-1",
        "topic": "Python",
        "prompt": "Explain the difference between a list, tuple, and dictionary in Python, including time complexity.",
        "keywords": ["mutable", "immutable", "hash", "O(1)", "lookup"],
        "framework": "Mutability -> structure -> lookup complexity -> practical use case.",
    },
    {
        "id": "tech-2",
        "topic": "SQL",
        "prompt": "Explain the difference between INNER JOIN, LEFT JOIN, and GROUP BY with HAVING.",
        "keywords": ["inner", "left", "null", "aggregate", "having"],
        "framework": "Join matching behavior -> row grouping -> WHERE vs HAVING.",
    },
    {
        "id": "tech-3",
        "topic": "Architecture",
        "prompt": "How do you diagnose and optimize a slow backend API endpoint in production?",
        "keywords": ["profiling", "query", "index", "cache", "latency"],
        "framework": "Measure bottlenecks -> DB indexing -> caching -> payload tuning.",
    },
    {
        "id": "tech-4",
        "topic": "Data Structures",
        "prompt": "Compare linear search and binary search, and explain when binary search cannot be used.",
        "keywords": ["sorted", "O(log n)", "O(n)", "midpoint", "random access"],
        "framework": "Prerequisites -> complexity -> edge cases.",
    },
    {
        "id": "tech-5",
        "topic": "Engineering",
        "prompt": "Explain how exception handling, logging, and automated testing improve software reliability.",
        "keywords": ["try", "catch", "logging", "test", "graceful"],
        "framework": "Error boundaries -> observability -> regression prevention.",
    },
]


def _get_client() -> Optional[Any]:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key or api_key == "your-gemini-api-key" or genai is None:
        return None
    return genai.Client(api_key=api_key)


def generate_interview_questions(
    interview_type: str,
    difficulty: str,
    target_role: str,
    question_count: int,
) -> List[Dict[str, Any]]:
    client = _get_client()
    if client is not None and types is not None:
        try:
            prompt = (
                f"Generate {question_count} realistic {difficulty} {interview_type} interview questions "
                f"for a candidate targeting the role: {target_role}. "
                "Return JSON array where each item has id, topic, prompt, keywords (3-5 items), and framework."
            )
            response = client.models.generate_content(
                model="gemini-4-hydrogen",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.5,
                ),
            )
            parsed = json.loads(response.text or "[]")
            if isinstance(parsed, list) and len(parsed) >= 1:
                return parsed[:question_count]
        except Exception:
            pass

    pool = (
        FALLBACK_HR_QUESTIONS
        if interview_type == "hr"
        else FALLBACK_TECHNICAL_QUESTIONS
        if interview_type == "technical"
        else [FALLBACK_HR_QUESTIONS[0], FALLBACK_TECHNICAL_QUESTIONS[0], FALLBACK_HR_QUESTIONS[2], FALLBACK_TECHNICAL_QUESTIONS[2], FALLBACK_TECHNICAL_QUESTIONS[4]]
    )
    selected: List[Dict[str, Any]] = []
    for idx in range(question_count):
        base = dict(pool[idx % len(pool)])
        base["id"] = f"{interview_type}-{idx + 1}"
        if interview_type == "custom":
            base["topic"] = f"{target_role} ({base['topic']})"
        selected.append(base)
    return selected
