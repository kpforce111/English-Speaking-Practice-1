import { pool } from "@workspace/db";

export const learningBoxes = {
  read_write: {
    id: "read_write",
    label: "For Those Who Can Read & Write",
    description: "Text-supported speaking, corrections, lessons, and practice.",
  },
  audio_first: {
    id: "audio_first",
    label: "For Those Who Cannot Read & Write",
    description: "Audio-first speaking and listening practice with minimal reading.",
  },
} as const;

export type LearningBoxId = keyof typeof learningBoxes;

export function parseLearningBoxId(value: unknown): LearningBoxId | null {
  return typeof value === "string" && value in learningBoxes
    ? value as LearningBoxId
    : null;
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
  await pool.query(
    `INSERT INTO box_subscriptions (user_id, box_id, plan, status, trial_ends_at)
     SELECT $1, box_id, 'trial', 'trialing', $2
     FROM (VALUES ('read_write'), ('audio_first')) AS boxes(box_id)
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