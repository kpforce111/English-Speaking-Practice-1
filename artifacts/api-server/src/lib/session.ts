import crypto from "node:crypto";
import type { Request, Response } from "express";
import { pool } from "@workspace/db";

const COOKIE_NAME = "rllora_session";
if (!process.env.SESSION_SECRET && process.env.NODE_ENV !== "test") {
  throw new Error("SESSION_SECRET must be configured outside test environments.");
}
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value && process.env.NODE_ENV !== "test") {
    throw new Error("SESSION_SECRET must be configured outside test environments.");
  }
  return value || "test-only-session-secret";
}

function sign(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function verified(value: string | undefined) {
  if (!value) return null;
  const [id, signature] = value.split(".");
  const expected = id ? sign(id) : "";
  if (!id || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }
  return id;
}

export async function getUserId(req: Request, res: Response): Promise<string> {
  const existing = verified(req.headers.cookie?.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))?.[1]);
  if (existing) {
    await pool.query("UPDATE device_sessions SET last_seen_at = NOW() WHERE id = $1", [existing]);
    const found = (await pool.query("SELECT user_id FROM device_sessions WHERE id = $1", [existing])).rows[0]?.user_id as string | undefined;
    if (found) return found;
  }
  const userId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  await pool.query("INSERT INTO users (id) VALUES ($1) ON CONFLICT DO NOTHING", [userId]);
  await pool.query("INSERT INTO device_sessions (id, user_id) VALUES ($1, $2)", [sessionId, userId]);
  await pool.query("INSERT INTO entitlements (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [userId]);
  res.cookie(COOKIE_NAME, `${sessionId}.${sign(sessionId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 365,
    path: "/",
  });
  return userId;
}

export function words(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export async function entitlement(userId: string) {
  const result = await pool.query("SELECT * FROM entitlements WHERE user_id = $1", [userId]);
  const row = result.rows[0];
  if (!row) return { plan: "free", status: "active", effectivePlan: "free", effectiveStatus: "active" };
  const now = Date.now();
  const trialActive = row.trial_ends_at && new Date(row.trial_ends_at).getTime() > now;
  const periodActive = row.current_period_ends_at && new Date(row.current_period_ends_at).getTime() > now;
  const providerActive = ["active", "trialing", "cancel_pending"].includes(String(row.status));
  const active = providerActive && (trialActive || periodActive);
  return {
    ...row,
    effectivePlan: active ? row.plan : "free",
    effectiveStatus: row.status === "pending_payment"
      ? "pending_payment"
      : active ? (row.status === "cancel_pending" ? "cancel_pending" : (trialActive ? "trialing" : "active")) : "expired",
  };
}

export async function requirePremium(req: Request, res: Response) {
  const userId = await getUserId(req, res);
  const current = await entitlement(userId);
  if (current.effectivePlan === "free" || current.effectiveStatus === "expired") {
    res.status(402).json({ error: "This feature is available with Premium.", code: "PREMIUM_REQUIRED" });
    return null;
  }
  return userId;
}

export async function recordEvent(userId: string, kind: string, content?: string, metadata?: unknown, durationSeconds?: number) {
  await pool.query(
    "INSERT INTO practice_events (id, user_id, kind, content, metadata, duration_seconds) VALUES ($1, $2, $3, $4, $5, $6)",
    [crypto.randomUUID(), userId, kind, content || null, metadata ? JSON.stringify(metadata) : null, durationSeconds || null],
  );
}

export async function textAllowance(userId: string) {
  const date = new Date().toISOString().slice(0, 10);
  await pool.query(
    "INSERT INTO daily_usage (user_id, usage_date) VALUES ($1, $2) ON CONFLICT (user_id, usage_date) DO NOTHING",
    [userId, date],
  );
  const row = (await pool.query("SELECT text_messages FROM daily_usage WHERE user_id = $1 AND usage_date = $2", [userId, date])).rows[0];
  const current = await entitlement(userId);
  const limit = current.effectivePlan === "free" ? 10 : 100;
  return { date, count: Number(row?.text_messages || 0), limit };
}

export async function reserveText(userId: string, limit: number) {
  const date = new Date().toISOString().slice(0, 10);
  const result = await pool.query(
    `INSERT INTO daily_usage (user_id, usage_date, text_messages) VALUES ($1, $2, 1)
     ON CONFLICT (user_id, usage_date) DO UPDATE SET text_messages = daily_usage.text_messages + 1
     WHERE daily_usage.text_messages < $3
     RETURNING text_messages`,
    [userId, date, limit],
  );
  return { date, reserved: result.rowCount === 1 };
}

export async function releaseText(userId: string, date: string) {
  await pool.query("UPDATE daily_usage SET text_messages = GREATEST(0, text_messages - 1) WHERE user_id = $1 AND usage_date = $2", [userId, date]);
}

export async function reserveVoice(userId: string, seconds: number) {
  const date = new Date().toISOString().slice(0, 10);
  const result = await pool.query(
    `INSERT INTO daily_usage (user_id, usage_date, voice_seconds) SELECT $1, $2, $3 WHERE $3 > 0 AND $3 <= 900
     ON CONFLICT (user_id, usage_date) DO UPDATE SET voice_seconds = daily_usage.voice_seconds + $3
     WHERE daily_usage.voice_seconds + $3 <= 900
     RETURNING voice_seconds`,
    [userId, date, seconds],
  );
  return { date, reserved: result.rowCount === 1 };
}

export async function releaseVoice(userId: string, date: string, seconds: number) {
  await pool.query("UPDATE daily_usage SET voice_seconds = GREATEST(0, voice_seconds - $1) WHERE user_id = $2 AND usage_date = $3", [seconds, userId, date]);
}