import { pool } from "@workspace/db";
import { effectiveBoxStatus, grantSharedTrial, parseLearningBoxId } from "./boxSubscriptions";
import { stripeConnectorRequest } from "./stripeConnector";

function timestampFromSeconds(value: unknown) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}

function subscriptionPeriodEnd(subscription: Record<string, any>) {
  return subscription.current_period_end || subscription.items?.data?.[0]?.current_period_end || null;
}

function mappedStripeStatus(subscription: Record<string, any>) {
  if (subscription.cancel_at_period_end && ["active", "trialing"].includes(subscription.status)) return "cancel_pending";
  if (subscription.status === "active") return "active";
  if (subscription.status === "trialing") return "trialing";
  return "cancelled";
}

async function activateCheckout(row: Record<string, any>) {
  const session = await stripeConnectorRequest<Record<string, any>>(`/v1/checkout/sessions/${encodeURIComponent(row.pending_payment_id)}`);
  if (session.status !== "complete" || !["paid", "no_payment_required"].includes(session.payment_status)) return;
  if (session.metadata?.userId !== row.user_id || session.metadata?.boxId !== row.box_id || !session.subscription) return;
  const subscription = await stripeConnectorRequest<Record<string, any>>(`/v1/subscriptions/${encodeURIComponent(String(session.subscription))}`);
  const boxId = parseLearningBoxId(subscription.metadata?.boxId);
  if (subscription.metadata?.userId !== row.user_id || boxId !== row.box_id) return;
  if (subscription.trial_end && session.metadata?.grantsSharedTrial === "true") {
    await grantSharedTrial(row.user_id, new Date(Number(subscription.trial_end) * 1000));
  }
  await pool.query(
    `UPDATE box_subscriptions SET
       plan = selected_plan, status = $1, provider_subscription_id = $2,
       provider_customer_id = $3, pending_payment_id = NULL,
       trial_ends_at = COALESCE($4, trial_ends_at),
       current_period_ends_at = COALESCE($5, current_period_ends_at)
     WHERE user_id = $6 AND box_id = $7 AND pending_payment_id = $8`,
    [
      mappedStripeStatus(subscription),
      subscription.id,
      session.customer || null,
      timestampFromSeconds(subscription.trial_end),
      timestampFromSeconds(subscriptionPeriodEnd(subscription)),
      row.user_id,
      boxId,
      row.pending_payment_id,
    ],
  );
  if (session.customer) {
    await pool.query("UPDATE users SET stripe_customer_id = $1 WHERE id = $2", [session.customer, row.user_id]);
  }
}

async function syncActiveSubscription(row: Record<string, any>) {
  const subscription = await stripeConnectorRequest<Record<string, any>>(`/v1/subscriptions/${encodeURIComponent(row.provider_subscription_id)}`);
  const boxId = parseLearningBoxId(subscription.metadata?.boxId);
  if (subscription.metadata?.userId !== row.user_id || boxId !== row.box_id) return;
  await pool.query(
    `UPDATE box_subscriptions SET
       status = $1,
       trial_ends_at = COALESCE($2, trial_ends_at),
       current_period_ends_at = COALESCE($3, current_period_ends_at)
     WHERE user_id = $4 AND box_id = $5 AND provider_subscription_id = $6`,
    [
      mappedStripeStatus(subscription),
      timestampFromSeconds(subscription.trial_end),
      timestampFromSeconds(subscriptionPeriodEnd(subscription)),
      row.user_id,
      boxId,
      row.provider_subscription_id,
    ],
  );
}

export async function syncStripeBilling(userId: string) {
  const result = await pool.query(
    `SELECT * FROM box_subscriptions
     WHERE user_id = $1 AND provider = 'stripe'
       AND (pending_payment_id IS NOT NULL OR provider_subscription_id IS NOT NULL)`,
    [userId],
  );
  for (const row of result.rows) {
    if (row.status === "pending_payment" && row.pending_payment_id) await activateCheckout(row);
    else if (row.provider_subscription_id && effectiveBoxStatus(row).effectivePlan !== "free") await syncActiveSubscription(row);
  }
}