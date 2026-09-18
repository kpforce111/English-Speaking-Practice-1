import crypto from "node:crypto";
import type { Request, Response } from "express";
import { pool } from "@workspace/db";
import { getAuth } from "@clerk/express";

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

async function getDeviceUserId(req: Request, res: Response): Promise<string> {
  const existing = verified(req.headers.cookie?.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))?.[1]);
  if (existing) {
    const found = (await pool.query(
      `SELECT ds.user_id, u.clerk_user_id
       FROM device_sessions ds
       JOIN users u ON u.id = ds.user_id
       WHERE ds.id = $1`,
      [existing],
    )).rows[0] as { user_id?: string; clerk_user_id?: string | null } | undefined;
    if (found?.user_id && !found.clerk_user_id) {
      await pool.query("UPDATE device_sessions SET last_seen_at = NOW() WHERE id = $1", [existing]);
      return found.user_id;
    }
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

async function mergeDeviceProfile(clerkUserId: string, deviceUserId: string): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [clerkUserId]);
    let accountId = (await client.query("SELECT id FROM users WHERE clerk_user_id = $1", [clerkUserId])).rows[0]?.id as string | undefined;
    if (!accountId) {
      accountId = crypto.randomUUID();
      await client.query("INSERT INTO users (id, clerk_user_id) VALUES ($1, $2) ON CONFLICT (clerk_user_id) DO NOTHING", [accountId, clerkUserId]);
      accountId = (await client.query("SELECT id FROM users WHERE clerk_user_id = $1", [clerkUserId])).rows[0].id;
      await client.query("INSERT INTO entitlements (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [accountId]);
    }
    if (!accountId) throw new Error("Unable to resolve account profile");
    if (accountId !== deviceUserId) {
      const sourceUser = (await client.query("SELECT clerk_user_id FROM users WHERE id = $1 FOR UPDATE", [deviceUserId])).rows[0];
      if (!sourceUser || sourceUser.clerk_user_id) {
        await client.query("COMMIT");
        return accountId;
      }
      await client.query("UPDATE practice_events SET user_id = $1 WHERE user_id = $2", [accountId, deviceUserId]);
      await client.query(
        `INSERT INTO daily_usage (user_id, usage_date, text_messages, voice_seconds)
         SELECT $1, usage_date, text_messages, voice_seconds FROM daily_usage WHERE user_id = $2
         ON CONFLICT (user_id, usage_date) DO UPDATE SET
           text_messages = daily_usage.text_messages + EXCLUDED.text_messages,
           voice_seconds = daily_usage.voice_seconds + EXCLUDED.voice_seconds`,
        [accountId, deviceUserId],
      );
      await client.query("DELETE FROM daily_usage WHERE user_id = $1", [deviceUserId]);
      await client.query(
        `INSERT INTO lesson_progress (user_id, lesson_id, level, completed_minutes, completed_at, updated_at)
         SELECT $1, lesson_id, level, completed_minutes, completed_at, updated_at FROM lesson_progress WHERE user_id = $2
         ON CONFLICT (user_id, lesson_id) DO UPDATE SET
           completed_minutes = lesson_progress.completed_minutes + EXCLUDED.completed_minutes,
           completed_at = COALESCE(lesson_progress.completed_at, EXCLUDED.completed_at),
           updated_at = GREATEST(lesson_progress.updated_at, EXCLUDED.updated_at)`,
        [accountId, deviceUserId],
      );
      await client.query("DELETE FROM lesson_progress WHERE user_id = $1", [deviceUserId]);
      const source = (await client.query("SELECT * FROM entitlements WHERE user_id = $1", [deviceUserId])).rows[0];
      const target = (await client.query("SELECT * FROM entitlements WHERE user_id = $1", [accountId])).rows[0];
      const sourceOwnsBilling = Boolean(source?.provider_subscription_id || source?.pending_payment_id);
      const targetOwnsBilling = Boolean(target?.provider_subscription_id || target?.pending_payment_id);
      if (sourceOwnsBilling && !targetOwnsBilling) {
        await client.query(
          `UPDATE entitlements target SET
             plan = source.plan,
             status = source.status,
             trial_ends_at = source.trial_ends_at,
             current_period_ends_at = source.current_period_ends_at,
             provider = source.provider,
             provider_customer_id = source.provider_customer_id,
             provider_subscription_id = source.provider_subscription_id,
             pending_payment_id = source.pending_payment_id,
             selected_plan = source.selected_plan
           FROM entitlements source
           WHERE target.user_id = $1 AND source.user_id = $2`,
          [accountId, deviceUserId],
        );
        await client.query(
          `UPDATE users target SET
             stripe_customer_id = COALESCE(target.stripe_customer_id, source.stripe_customer_id),
             razorpay_customer_id = COALESCE(target.razorpay_customer_id, source.razorpay_customer_id)
           FROM users source WHERE target.id = $1 AND source.id = $2`,
          [accountId, deviceUserId],
        );
        await client.query("UPDATE users SET stripe_customer_id = NULL, razorpay_customer_id = NULL WHERE id = $1", [deviceUserId]);
      }
      if (!sourceOwnsBilling || !targetOwnsBilling) {
        await client.query(
          `UPDATE entitlements SET
             plan = 'free', status = 'active', trial_ends_at = NULL,
             current_period_ends_at = NULL, provider = NULL,
             provider_customer_id = NULL, provider_subscription_id = NULL,
             pending_payment_id = NULL, selected_plan = NULL
           WHERE user_id = $1`,
          [deviceUserId],
        );
      }
    }
    await client.query("COMMIT");
    return accountId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getUserId(req: Request, res: Response): Promise<string> {
  const deviceUserId = await getDeviceUserId(req, res);
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  return clerkUserId ? mergeDeviceProfile(clerkUserId, deviceUserId) : deviceUserId;
}

export function authenticatedClerkUserId(req: Request): string | null {
  const auth = getAuth(req);
  return auth?.userId || null;
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