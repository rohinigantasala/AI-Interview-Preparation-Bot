"""
AI Interview Preparation Bot - Flask Backend (Portable Python Reference Implementation)
Run locally with:
    python app.py
"""

import os
from dotenv import load_dotenv
from flask import Flask, flash, jsonify, redirect, render_template, request, session, url_for

from auth import authenticate_user, get_logged_in_user, login_required, register_user
from database import (
    create_interview_attempt,
    finalize_attempt,
    get_attempt_for_user,
    get_dashboard_summary,
    init_db,
    list_user_history,
    update_attempt_progress,
)
from evaluator import build_final_report, evaluate_answer, validate_answer
from interview_engine import generate_interview_questions

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-interview-bot-secret-key")
init_db()


@app.context_processor
def inject_user():
    return {"current_user": get_logged_in_user()}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if get_logged_in_user():
        return redirect(url_for("dashboard"))
    if request.method == "POST":
        email = request.form.get("email", "")
        password = request.form.get("password", "")
        user, error = authenticate_user(email, password)
        if error:
            flash(error, "error")
            return render_template("login.html", email=email)
        session["user_id"] = user["id"]
        return redirect(url_for("dashboard"))
    return render_template("login.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if get_logged_in_user():
        return redirect(url_for("dashboard"))
    if request.method == "POST":
        full_name = request.form.get("full_name", "")
        email = request.form.get("email", "")
        password = request.form.get("password", "")
        confirm = request.form.get("confirm_password", "")
        user, error = register_user(full_name, email, password, confirm)
        if error:
            flash(error, "error")
            return render_template("register.html", full_name=full_name, email=email)
        session["user_id"] = user["id"]
        return redirect(url_for("dashboard"))
    return render_template("register.html")


@app.route("/logout", methods=["POST", "GET"])
def logout():
    session.clear()
    return redirect(url_for("index"))


@app.route("/dashboard")
@login_required
def dashboard():
    user = get_logged_in_user()
    summary = get_dashboard_summary(user["id"])
    return render_template("dashboard.html", summary=summary)


@app.route("/configure", methods=["GET", "POST"])
@login_required
def configure():
    user = get_logged_in_user()
    if request.method == "POST":
        interview_type = request.form.get("interview_type", "hr")
        interview_mode = request.form.get("interview_mode", "voice")
        difficulty = request.form.get("difficulty", "intermediate")
        question_count = int(request.form.get("question_count", "5"))
        target_role = request.form.get("target_role", "Software Developer").strip() or "Software Developer"

        questions = generate_interview_questions(
            interview_type, difficulty, target_role, question_count
        )
        attempt_id = create_interview_attempt(
            user["id"], interview_type, interview_mode, difficulty, target_role, questions
        )
        session["active_attempt_id"] = attempt_id
        if interview_mode == "voice":
            return redirect(url_for("voice_interview"))
        return redirect(url_for("text_interview"))

    preset_type = request.args.get("type", "hr")
    return render_template("configure_interview.html", preset_type=preset_type)


@app.route("/interview/voice")
@login_required
def voice_interview():
    user = get_logged_in_user()
    attempt_id = session.get("active_attempt_id")
    if not attempt_id:
        return redirect(url_for("configure"))
    attempt = get_attempt_for_user(int(attempt_id), user["id"])
    if not attempt or attempt["status"] == "completed":
        return redirect(url_for("configure"))
    return render_template("voice_interview.html", attempt=attempt)


@app.route("/interview/text")
@login_required
def text_interview():
    user = get_logged_in_user()
    attempt_id = session.get("active_attempt_id")
    if not attempt_id:
        return redirect(url_for("configure"))
    attempt = get_attempt_for_user(int(attempt_id), user["id"])
    if not attempt or attempt["status"] == "completed":
        return redirect(url_for("configure"))
    question = attempt["questions"][attempt["current_index"]]
    return render_template("text_interview.html", attempt=attempt, question=question)


@app.route("/api/interview/submit", methods=["POST"])
@login_required
def api_submit_answer():
    user = get_logged_in_user()
    payload = request.get_json(silent=True) or request.form
    attempt_id = int(payload.get("attempt_id") or session.get("active_attempt_id") or 0)
    answer = payload.get("answer", "")
    duration_seconds = int(payload.get("duration_seconds") or 0)

    check = validate_answer(answer)
    if not check["valid"]:
        return jsonify({"error": check["error"]}), 400

    attempt = get_attempt_for_user(attempt_id, user["id"])
    if not attempt:
        return jsonify({"error": "Interview session not found."}), 404

    idx = attempt["current_index"]
    question = attempt["questions"][idx]
    evaluation = evaluate_answer(
        question, answer, attempt["target_role"], attempt["difficulty"]
    )
    evaluations = list(attempt["evaluations"])
    if len(evaluations) > idx:
        evaluations[idx] = evaluation
    else:
        evaluations.append(evaluation)

    update_attempt_progress(
        attempt_id, user["id"], idx, attempt["questions"], evaluations, duration_seconds
    )

    if request.is_json:
        return jsonify({"evaluation": evaluation})
    return redirect(url_for("feedback"))


@app.route("/feedback")
@login_required
def feedback():
    user = get_logged_in_user()
    attempt_id = session.get("active_attempt_id")
    if not attempt_id:
        return redirect(url_for("dashboard"))
    attempt = get_attempt_for_user(int(attempt_id), user["id"])
    if not attempt or not attempt["evaluations"]:
        return redirect(url_for("dashboard"))
    return render_template(
        "feedback.html", attempt=attempt, evaluation=attempt["evaluations"][-1]
    )


@app.route("/api/interview/next", methods=["POST"])
@login_required
def api_next_question():
    user = get_logged_in_user()
    payload = request.get_json(silent=True) or request.form
    attempt_id = int(payload.get("attempt_id") or session.get("active_attempt_id") or 0)
    duration_seconds = int(payload.get("duration_seconds") or 0)

    attempt = get_attempt_for_user(attempt_id, user["id"])
    if not attempt:
        return jsonify({"error": "Interview session not found."}), 404

    next_idx = attempt["current_index"] + 1
    if next_idx >= len(attempt["questions"]):
        report = build_final_report(
            attempt_id,
            attempt["interview_type"],
            attempt["interview_mode"],
            attempt["difficulty"],
            attempt["target_role"],
            attempt["evaluations"],
            duration_seconds,
        )
        finalize_attempt(attempt_id, user["id"], report, duration_seconds)
        session.pop("active_attempt_id", None)
        if request.is_json:
            return jsonify({"completed": True, "report": report})
        return redirect(url_for("result", attempt_id=attempt_id))

    update_attempt_progress(
        attempt_id,
        user["id"],
        next_idx,
        attempt["questions"],
        attempt["evaluations"],
        duration_seconds,
    )
    if request.is_json:
        return jsonify(
            {"completed": False, "current_index": next_idx, "question": attempt["questions"][next_idx]}
        )
    return redirect(
        url_for("voice_interview" if attempt["interview_mode"] == "voice" else "text_interview")
    )


@app.route("/result/<int:attempt_id>")
@login_required
def result(attempt_id: int):
    user = get_logged_in_user()
    attempt = get_attempt_for_user(attempt_id, user["id"])
    if not attempt or not attempt["report"]:
        return redirect(url_for("dashboard"))
    return render_template("result.html", report=attempt["report"])


@app.route("/history")
@login_required
def history():
    user = get_logged_in_user()
    attempts = list_user_history(user["id"])
    return render_template("history.html", history=attempts)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
