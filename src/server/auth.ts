import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { db } from './db';
import type { AuthUser } from '../lib/types';

export const AUTH_COOKIE_NAME = 'prepbot_auth';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function registerUser(params: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): { ok: true; user: AuthUser; token: string } | { ok: false; status: number; error: string } {
  const fullName = (params.fullName ?? '').trim();
  const email = (params.email ?? '').trim().toLowerCase();
  const password = params.password ?? '';
  const confirmPassword = params.confirmPassword ?? '';

  if (fullName.length < 2) {
    return { ok: false, status: 400, error: 'Please enter your full name (at least 2 characters).' };
  }
  if (!validateEmail(email)) {
    return { ok: false, status: 400, error: 'Please enter a valid email address.' };
  }
  if (password.length < 6) {
    return { ok: false, status: 400, error: 'Password must be at least 6 characters long.' };
  }
  if (password !== confirmPassword) {
    return { ok: false, status: 400, error: 'Passwords do not match.' };
  }

  const existing = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(email) as { id: number } | undefined;

  if (existing) {
    return { ok: false, status: 409, error: 'An account with this email already exists.' };
  }

  const now = new Date().toISOString();
  const passwordHash = hashPassword(password);
  const insert = db
    .prepare('INSERT INTO users (full_name, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .run(fullName, email, passwordHash, now);

  const userId = Number(insert.lastInsertRowid);
  const token = createAuthSession(userId);

  return {
    ok: true,
    token,
    user: {
      id: userId,
      fullName,
      email,
      createdAt: now,
    },
  };
}

export function loginUser(params: {
  email: string;
  password: string;
}): { ok: true; user: AuthUser; token: string } | { ok: false; status: number; error: string } {
  const email = (params.email ?? '').trim().toLowerCase();
  const password = params.password ?? '';

  if (!validateEmail(email) || !password) {
    return { ok: false, status: 400, error: 'Please enter both email address and password.' };
  }

  const row = db
    .prepare('SELECT id, full_name, email, password_hash, created_at FROM users WHERE email = ?')
    .get(email) as
    | { id: number; full_name: string; email: string; password_hash: string; created_at: string }
    | undefined;

  if (!row || !verifyPassword(password, row.password_hash)) {
    return { ok: false, status: 401, error: 'Invalid email address or password.' };
  }

  const token = createAuthSession(row.id);

  return {
    ok: true,
    token,
    user: {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      createdAt: row.created_at,
    },
  };
}

export function createAuthSession(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7).toISOString();
  db.prepare(
    'INSERT INTO auth_sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).run(token, userId, expiresAt, now.toISOString());
  return token;
}

export function deleteAuthSession(token: string): void {
  if (!token) return;
  db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    if (key) result[key] = val;
  }
  return result;
}

export function extractAuthToken(req: Request): string {
  const headerToken =
    typeof req.headers['x-auth-token'] === 'string'
      ? req.headers['x-auth-token'].trim()
      : '';
  if (headerToken) return headerToken;
  const cookies = parseCookies(req.headers.cookie);
  return cookies[AUTH_COOKIE_NAME] || '';
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
}

export function getAuthenticatedUser(req: Request): AuthUser | null {
  const token = extractAuthToken(req);
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT u.id, u.full_name, u.email, u.created_at, s.expires_at
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
    )
    .get(token) as
    | {
        id: number;
        full_name: string;
        email: string;
        created_at: string;
        expires_at: string;
      }
    | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    deleteAuthSession(token);
    return null;
  }

  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    createdAt: row.created_at,
  };
}
