import { pool } from "@workspace/db";

export const learningBoxes = {
  start_zero: {
    id: "start_zero",
    label: "Zero English / Start from Zero",
    description: "Voice-first, picture-supported English for complete beginners.",
  },
  advanced: {
    id: "advanced",
    label: "Advanced English Coach",
    description: "Text-supported speaking, corrections, lessons, and practice.",
  },
} as const;

export type LearningBoxId = keyof typeof learningBoxes;
const legacyBoxIds = { read_write: "advanced", audio_first: "start_zero" } as const;

export function parseLearningBoxId(value: unknown): LearningBoxId | null {
  if (typeof value !== "string") return null;
  if (value in learningBoxes) return value as LearningBoxId;
  return value in legacyBoxIds ? legacyBoxIds[value as keyof typeof legacyBoxIds] : null;
}

export function canonicalBoxId(value: unknown): LearningBoxId | null {
  return parseLearningBoxId(value);
}

export function boxSqlIds(boxId: LearningBoxId) {
  return boxId === "advanced" ? ["advanced", "read_write"] : ["start_zero", "audio_first"];
}

export function boxLabel(value: unknown) {
  const id = canonicalBoxId(value);
  return id ? learningBoxes[id] : null;
}

export function canonicalizeSubscriptionRow<T extends Record<string, any>>(row: T): T & { box_id: LearningBoxId } {
  const boxId = canonicalBoxId(row.box_id);
  return boxId ? { ...row, box_id: boxId } : row as T & { box_id: LearningBoxId };
}

export function strongestLogicalRow(rows: Array<Record<string, any>>, boxId: LearningBoxId): any {
  return rows
    .filter((row) => canonicalBoxId(row.box_id) === boxId)
    .map((row) => ({ ...row, ...effectiveBoxStatus(row), box_id: boxId }))
    .sort((a, b) => {
      const rank = (row: Record<string, any>) => {
        if (row.effectiveStatus === "active" || row.effectiveStatus === "cancel_pending") return row.provider_subscription_id ? 4 : 3;
        if (row.effectiveStatus === "trialing") return 2;
        if (row.status === "pending_payment") return 1;
        return 0;
      };
      const score = rank(b) - rank(a);
      if (score) return score;
      const end = (row: Record<string, any>) => new Date(row.current_period_ends_at || row.trial_ends_at || 0).getTime();
      return end(b) - end(a);
    })[0] || null;
}

export function boxEnvSegment(boxId: LearningBoxId) {
  return boxId.toUpperCase();
}

export async function sharedTrialState(userId: string) {
  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE trial_ends_at IS NOT NULL OR status = 'pending_payment')::int AS used_count,
       MAX(trial_ends_at) FILTER (WHERE trial_ends_at > NOW()) AS active_trial_ends_at
     FROM box_subscriptions WHERE user_id = $1`,
    [userId],
  );
  return {
    used: Number(result.rows[0]?.used_count || 0) > 0,
    activeTrialEndsAt: result.rows[0]?.active_trial_ends_at
      ? new Date(result.rows[0].active_trial_ends_at)
      : null,
  };
}

export async function grantSharedTrial(userId: string, trialEndsAt: Date) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [userId]);
    await grantSharedTrialOnClient(client, userId, trialEndsAt);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function grantSharedTrialOnClient(client: { query: (text: string, values?: unknown[]) => Promise<unknown> }, userId: string, trialEndsAt: Date) {
  await client.query(
    `INSERT INTO box_subscriptions (user_id, box_id, plan, status, trial_ends_at)
     SELECT $1, box_id, 'trial', 'trialing', $2
     FROM (VALUES ('start_zero'), ('advanced')) AS boxes(box_id)
     ON CONFLICT (user_id, box_id) DO UPDATE SET
       plan = CASE WHEN box_subscriptions.provider_subscription_id IS NULL THEN 'trial' ELSE box_subscriptions.plan END,
       status = CASE WHEN box_subscriptions.provider_subscription_id IS NULL THEN 'trialing' ELSE box_subscriptions.status END,
       trial_ends_at = GREATEST(box_subscriptions.trial_ends_at, EXCLUDED.trial_ends_at)`,
    [userId, trialEndsAt.toISOString()],
  );
}

export function effectiveBoxStatus<T extends Record<string, unknown>>(row: T): T & {
  effectivePlan: unknown;
  effectiveStatus: string;
} {
  const now = Date.now();
  const trialActive = row.trial_ends_at && new Date(String(row.trial_ends_at)).getTime() > now;
  const periodActive = row.current_period_ends_at && new Date(String(row.current_period_ends_at)).getTime() > now;
  const providerActive = ["active", "trialing", "cancel_pending"].includes(String(row.status));
  const active = providerActive && Boolean(trialActive || periodActive);
  return {
    ...row,
    effectivePlan: active ? row.plan : "free",
    effectiveStatus: row.status === "pending_payment"
      ? "pending_payment"
      : active
        ? (row.status === "cancel_pending" ? "cancel_pending" : (trialActive ? "trialing" : "active"))
        : "expired",
  };
}