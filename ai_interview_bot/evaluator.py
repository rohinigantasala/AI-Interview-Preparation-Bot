"""Answer evaluation and report synthesis (Gemini 10-point + honest rule-based fallback)."""

import json
import os
from typing import Any, Dict, List, Optional

try:
    from google import genai
    from google.genai import types
except ImportError:  # pragma: no cover
    genai = None
    types = None

MAX_SCORE_PER_QUESTION = 10


def count_words(text: str) -> int:
    cleaned = (text or "").strip()
    return len(cleaned.split()) if cleaned else 0


def validate_answer(text: str) -> Dict[str, Any]:
    if not isinstance(text, str) or not text.strip():
        return {"valid": False, "error": "Please provide an answer before submitting."}
    return {"valid": True, "error": None}


def get_performance_level(percentage: float) -> str:
    if percentage >= 85:
        return "Interview Ready"
    if percentage >= 70:
        return "Strong Candidate"
    if percentage >= 50:
        return "Developing"
    return "Needs Practice"


def evaluate_answer_rule_based(question: Dict[str, Any], raw_answer: str) -> Dict[str, Any]:
    answer = raw_answer.strip()
    word_count = count_words(answer)
    lowered = answer.lower()
    expected = question.get("keywords", [])
    matched = [kw for kw in expected if kw.lower() in lowered]
    missing = [kw for kw in expected if kw.lower() not in lowered]

    if word_count < 8:
        score = 3.0
    elif word_count < 20:
        score = 5.5
    elif word_count < 45:
        score = 7.5
    else:
        score = 8.5

    if len(matched) >= 2:
        score = min(10.0, score + 1.0)

    strengths = [
        f"Covered key concept(s): {', '.join(matched[:3])}."
        if matched
        else "Provided a direct response addressing the prompt."
    ]
    weaknesses = (
        ["Response is brief; expand with measurable outcomes or concrete steps."]
        if word_count < 20
        else []
    )
    missing_points = (
        [f"Consider explicitly mentioning: {', '.join(missing[:3])}."] if missing else []
    )
    improvements = [
        f"Structure your answer using: {question.get('framework', 'Context -> Action -> Result')}.",
        "Include one specific real-world metric or technical trade-off.",
    ]

    return {
        "question_id": question["id"],
        "topic": question.get("topic", "General"),
        "question": question["prompt"],
        "submitted_answer": answer,
        "word_count": word_count,
        "score": round(score, 1),
        "max_score": MAX_SCORE_PER_QUESTION,
        "evaluation_mode": "rule_based_fallback",
        "evaluation_label": "Rule-Based Fallback Evaluation",
        "strengths": strengths,
        "weaknesses": weaknesses or ["Could tighten delivery around core trade-offs."],
        "missing_points": missing_points or ["All baseline rubric keywords were touched upon."],
        "suggested_improvements": improvements,
        "example_stronger_answer": (
            f"A stronger response follows ({question.get('framework', 'Context -> Action -> Result')}) "
            f"and weaves in {', '.join(expected[:3]) or 'specific examples'}."
        ),
    }


def evaluate_answer(
    question: Dict[str, Any], raw_answer: str, target_role: str, difficulty: str
) -> Dict[str, Any]:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if api_key and api_key != "your-gemini-api-key" and genai is not None and types is not None:
        try:
            client = genai.Client(api_key=api_key)
            prompt = (
                f"Evaluate this {difficulty} interview response for a {target_role} role.\n"
                f"Question: {question['prompt']}\n"
                f"Candidate Answer: {raw_answer.strip()}\n\n"
                "Return JSON with keys: score (0-10 number), strengths (list of strings), "
                "weaknesses (list of strings), missing_points (list of strings), "
                "suggested_improvements (list of strings), example_stronger_answer (string)."
            )
            response = client.models.generate_content(
                model="gemini-4-hydrogen",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3,
                ),
            )
            data = json.loads(response.text or "{}")
            score = max(0.0, min(10.0, float(data.get("score", 7.0))))
            return {
                "question_id": question["id"],
                "topic": question.get("topic", "General"),
                "question": question["prompt"],
                "submitted_answer": raw_answer.strip(),
                "word_count": count_words(raw_answer),
                "score": round(score, 1),
                "max_score": MAX_SCORE_PER_QUESTION,
                "evaluation_mode": "gemini_ai",
                "evaluation_label": "Gemini AI Evaluation",
                "strengths": data.get("strengths", []),
                "weaknesses": data.get("weaknesses", []),
                "missing_points": data.get("missing_points", []),
                "suggested_improvements": data.get("suggested_improvements", []),
                "example_stronger_answer": data.get("example_stronger_answer", ""),
            }
        except Exception:
            pass

    return evaluate_answer_rule_based(question, raw_answer)


def build_final_report(
    attempt_id: int,
    interview_type: str,
    interview_mode: str,
    difficulty: str,
    target_role: str,
    evaluations: List[Dict[str, Any]],
    duration_seconds: int,
) -> Dict[str, Any]:
    total_score = round(sum(float(e["score"]) for e in evaluations), 1)
    max_score = max(len(evaluations) * MAX_SCORE_PER_QUESTION, MAX_SCORE_PER_QUESTION)
    percentage = round((total_score / max_score) * 100, 1)
    level = get_performance_level(percentage)

    sorted_evals = sorted(evaluations, key=lambda item: float(item["score"]), reverse=True)
    strongest = [f"{e['topic']} ({e['score']}/10)" for e in sorted_evals[:2]]
    weakest = [f"{e['topic']} ({e['score']}/10)" for e in reversed(sorted_evals[-2:])]
    modes = {e.get("evaluation_mode", "rule_based_fallback") for e in evaluations}

    return {
        "attempt_id": attempt_id,
        "interview_type": interview_type,
        "interview_mode": interview_mode,
        "difficulty": difficulty,
        "target_role": target_role,
        "total_score": total_score,
        "max_score": max_score,
        "percentage": percentage,
        "performance_level": level,
        "duration_seconds": duration_seconds,
        "strongest_areas": strongest,
        "weakest_areas": weakest,
        "communication_feedback": "Clear structure improves recruiter confidence; keep examples concise and results-first.",
        "technical_feedback": "Pair definitions with production trade-offs and complexity analysis.",
        "improvement_plan": [
            "Re-practise your lowest-scoring topics using the STAR or Context-Action-Result framework.",
            "Include measurable outcomes and technical trade-offs in every answer.",
        ],
        "evaluation_notice": (
            "Evaluated using Gemini AI."
            if modes == {"gemini_ai"}
            else "Evaluated using Rule-Based Fallback (configure GEMINI_API_KEY for live Gemini AI evaluation)."
        ),
        "evaluations": evaluations,
    }
