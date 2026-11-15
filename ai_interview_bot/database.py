"""SQLite persistence layer for users and interview attempts."""

import json
import os
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

DB_PATH = os.environ.get("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "prepbot.sqlite"))


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS interview_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                interview_type TEXT NOT NULL,
                interview_mode TEXT NOT NULL,
                difficulty TEXT NOT NULL,
                target_role TEXT NOT NULL,
                question_count INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'in_progress',
                current_index INTEGER NOT NULL DEFAULT 0,
                questions_json TEXT NOT NULL,
                evaluations_json TEXT NOT NULL DEFAULT '[]',
                report_json TEXT,
                total_score REAL NOT NULL DEFAULT 0,
                max_score REAL NOT NULL DEFAULT 50,
                percentage REAL NOT NULL DEFAULT 0,
                performance_level TEXT NOT NULL DEFAULT 'Needs Improvement',
                duration_seconds INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )


def create_user(full_name: str, email: str, password_hash: str) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO users (full_name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
            (full_name.strip(), email.strip().lower(), password_hash, now),
        )
        return {
            "id": cur.lastrowid,
            "full_name": full_name.strip(),
            "email": email.strip().lower(),
            "created_at": now,
        }


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?", (email.strip().lower(),)
        ).fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, full_name, email, created_at FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        return dict(row) if row else None


def create_interview_attempt(
    user_id: int,
    interview_type: str,
    interview_mode: str,
    difficulty: str,
    target_role: str,
    questions: List[Dict[str, Any]],
) -> int:
    now = datetime.now(timezone.utc).isoformat()
    max_score = len(questions) * 10
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO interview_attempts (
                user_id, interview_type, interview_mode, difficulty, target_role,
                question_count, status, current_index, questions_json, evaluations_json,
                max_score, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'in_progress', 0, ?, '[]', ?, ?)
            """,
            (
                user_id,
                interview_type,
                interview_mode,
                difficulty,
                target_role,
                len(questions),
                json.dumps(questions),
                max_score,
                now,
            ),
        )
        return int(cur.lastrowid)


def get_attempt_for_user(attempt_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM interview_attempts WHERE id = ? AND user_id = ?",
            (attempt_id, user_id),
        ).fetchone()
        if not row:
            return None
        data = dict(row)
        data["questions"] = json.loads(data["questions_json"])
        data["evaluations"] = json.loads(data["evaluations_json"])
        data["report"] = json.loads(data["report_json"]) if data["report_json"] else None
        return data


def update_attempt_progress(
    attempt_id: int,
    user_id: int,
    current_index: int,
    questions: List[Dict[str, Any]],
    evaluations: List[Dict[str, Any]],
    duration_seconds: int,
) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE interview_attempts
            SET current_index = ?, questions_json = ?, evaluations_json = ?, duration_seconds = ?
            WHERE id = ? AND user_id = ?
            """,
            (
                current_index,
                json.dumps(questions),
                json.dumps(evaluations),
                duration_seconds,
                attempt_id,
                user_id,
            ),
        )


def finalize_attempt(
    attempt_id: int,
    user_id: int,
    report: Dict[str, Any],
    duration_seconds: int,
) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE interview_attempts
            SET status = 'completed',
                report_json = ?,
                total_score = ?,
                max_score = ?,
                percentage = ?,
                performance_level = ?,
                duration_seconds = ?,
                completed_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (
                json.dumps(report),
                report["total_score"],
                report["max_score"],
                report["percentage"],
                report["performance_level"],
                duration_seconds,
                now,
                attempt_id,
                user_id,
            ),
        )


def list_user_history(user_id: int) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, interview_type, interview_mode, difficulty, target_role,
                   question_count, status, total_score, max_score, percentage,
                   performance_level, duration_seconds, created_at, completed_at
            FROM interview_attempts
            WHERE user_id = ? AND status = 'completed'
            ORDER BY id DESC
            """,
            (user_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def get_dashboard_summary(user_id: int) -> Dict[str, Any]:
    history = list_user_history(user_id)
    count = len(history)
    avg_pct = round(sum(h["percentage"] for h in history) / count, 1) if count else 0.0
    best_pct = max((h["percentage"] for h in history), default=0.0)
    total_seconds = sum(h["duration_seconds"] for h in history)
    return {
        "interviews_completed": count,
        "average_score": avg_pct,
        "best_performance": best_pct,
        "total_practice_seconds": total_seconds,
        "recent_history": history[:6],
    }
