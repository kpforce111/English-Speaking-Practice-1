import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { clerkClient } from "@clerk/express";
import { pool } from "@workspace/db";
import { authenticatedClerkUserId } from "../lib/session";
import { grantSharedTrial } from "../lib/boxSubscriptions";

const router: IRouter = Router();
const OWNER_EMAIL = "hello@rllora.com";
const MANAGED_SETTING_KEYS = new Set(["legal/privacy", "legal/terms", "support"]);

const defaultPrivacy = {
  title: "Privacy Policy",
  description: "How we handle your data, voice recordings, and AI interactions.",
  sections: [
    { heading: "1. Information We Collect", body: "We collect basic account information and practice data (sentences spoken, minutes, active days) to provide the service and track your progress." },
    { heading: "2. Audio and AI Processing", body: "When you use our voice practice or roleplay features, your audio and text inputs are processed by our AI partners (including OpenAI and Replit integrations) to generate responses, transcripts, and feedback. Audio recordings are processed transiently and are not stored permanently by us. Transcripts of your conversations are saved to allow you to review your practice history and receive progress reports." },
    { heading: "3. Data Retention", body: "Your practice history is retained as long as your account is active. You may request account deletion at any time via the Support page, which will permanently remove your transcripts and progress data." },
    { heading: "4. Subscriptions and Payments", body: "Payments are temporarily paused while PhonePe merchant approval and integration are completed. We do not store full card numbers or UPI credentials on our servers." },
  ],
};

const defaultTerms = {
  title: "Terms of Service",
  description: "Rules and guidelines for using Rllora AI.",
  sections: [
    { heading: "1. Acceptance of Terms", body: "By using Rllora AI, you agree to these terms. If you do not agree, do not use the app." },
    { heading: "2. Subscriptions, Auto-Renewal, and Cancellation", body: "Premium features require an active subscription. Subscriptions automatically renew at the end of each billing period (monthly, quarterly, or yearly) unless canceled. You may cancel at any time through your account settings or by contacting support. Cancellation stops future charges but does not refund past periods." },
    { heading: "3. Acceptable Use", body: "You agree to use the AI practice tools for language learning purposes only. Do not attempt to bypass rate limits or misuse the AI models to generate prohibited content." },
    { heading: "4. Disclaimers", body: "Rllora AI is an educational tool. It does not provide medical, legal, or emergency advice. Roleplay scenarios are for language practice only." },
  ],
};

const defaultSupport = {
  email: "hello@rllora.com",
  whatsappDisplay: "+91 8850551703",
  whatsappNumber: "918850551703",
  announcement: "",
};

function defaultSetting(key: string) {
  if (key === "legal/privacy") return defaultPrivacy;
  if (key === "legal/terms") return defaultTerms;
  return defaultSupport;
}

async function setting(key: string) {
  const row = (await pool.query("SELECT value, updated_at FROM app_settings WHERE key = $1", [key])).rows[0];
  return { key, value: row?.value ?? defaultSetting(key), updatedAt: row?.updated_at ?? null };
}

function validLegalContent(value: unknown): value is { title: string; description: string; sections: Array<{ heading: string; body: string }> } {
  if (!value || typeof value !== "object") return false;
  const content = value as Record<string, unknown>;
  return typeof content.title === "string" && content.title.trim().length > 0 && content.title.length <= 120 &&
    typeof content.description === "string" && content.description.trim().length > 0 && content.description.length <= 500 &&
    Array.isArray(content.sections) && content.sections.length > 0 && content.sections.length <= 20 &&
    content.sections.every((section) => {
      if (!section || typeof section !== "object") return false;
      const item = section as Record<string, unknown>;
      return typeof item.heading === "string" && item.heading.trim().length > 0 && item.heading.length <= 160 &&
        typeof item.body === "string" && item.body.trim().length > 0 && item.body.length <= 10000;
    });
}

function validSupportContent(value: unknown): value is typeof defaultSupport {
  if (!value || typeof value !== "object") return false;
  const content = value as Record<string, unknown>;
  return typeof content.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.email) &&
    typeof content.whatsappDisplay === "string" && content.whatsappDisplay.length <= 40 &&
    typeof content.whatsappNumber === "string" && /^\d{8,15}$/.test(content.whatsappNumber) &&
    typeof content.announcement === "string" && content.announcement.length <= 500;
}

async function requireOwner(req: Request, res: Response, next: NextFunction) {
  const clerkUserId = authenticatedClerkUserId(req);
  if (!clerkUserId) {
    res.status(401).json({ error: "Sign in with the owner account.", code: "ADMIN_SIGN_IN_REQUIRED" });
    return;
  }
  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    const verifiedOwner = user.emailAddresses.some((address) =>
      address.emailAddress.toLowerCase() === OWNER_EMAIL &&
      address.verification?.status === "verified",
    );
    if (!verifiedOwner) {
      res.status(403).json({ error: "This account does not have owner access.", code: "ADMIN_FORBIDDEN" });
      return;
    }
    res.locals.ownerClerkUserId = clerkUserId;
    next();
  } catch (error) {
    req.log.error({ error }, "owner authorization failed");
    res.status(503).json({ error: "Owner authorization could not be verified." });
  }
}

router.get("/content/:group/:name", async (req, res) => {
  const key = `${req.params.group}/${req.params.name}`;
  if (!MANAGED_SETTING_KEYS.has(key)) {
    res.status(404).json({ error: "Content not found." });
    return;
  }
  res.json(await setting(key));
});

router.get("/content/support", async (_req, res) => {
  res.json(await setting("support"));
});

router.get("/admin/me", requireOwner, (_req, res) => {
  res.json({ role: "owner", email: OWNER_EMAIL });
});

router.get("/admin/overview", requireOwner, async (_req, res) => {
  const [users, signedIn, active, trials, pending, events] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM users"),
    pool.query("SELECT COUNT(*)::int AS count FROM users WHERE clerk_user_id IS NOT NULL"),
    pool.query("SELECT COUNT(*)::int AS count FROM entitlements WHERE plan = 'premium' AND status IN ('active', 'cancel_pending') AND COALESCE(current_period_ends_at, trial_ends_at) > NOW()"),
    pool.query("SELECT COUNT(*)::int AS count FROM entitlements WHERE plan = 'premium' AND status = 'trialing' AND trial_ends_at > NOW()"),
    pool.query("SELECT COUNT(*)::int AS count FROM entitlements WHERE status = 'pending_payment'"),
    pool.query("SELECT COUNT(*)::int AS count FROM billing_events WHERE processed_at >= NOW() - INTERVAL '30 days'"),
  ]);
  res.json({
    counts: {
      users: users.rows[0].count,
      signedInUsers: signedIn.rows[0].count,
      activeSubscriptions: active.rows[0].count,
      activeTrials: trials.rows[0].count,
      pendingPayments: pending.rows[0].count,
      billingEvents30Days: events.rows[0].count,
    },
    services: {
      aiChat: Boolean(process.env.AI_INTEGRATIONS_OPENAI_API_KEY),
      voiceAi: Boolean(process.env.AI_INTEGRATIONS_OPENAI_API_KEY),
      pronunciation: Boolean(process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_LANGUAGE_CONFIDENCE_URL),
      payments: { gateway: "inactive", phonepeApprovalPending: true },
    },
  });
});

router.get("/admin/users", requireOwner, async (req, res) => {
  const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = 30;
  const offset = (page - 1) * limit;
  const search = String(req.query.search || "").trim();
  const params: unknown[] = [];
  let where = "";
  if (search) {
    params.push(`%${search}%`);
    where = "WHERE u.id ILIKE $1 OR COALESCE(u.clerk_user_id, '') ILIKE $1";
  }
  params.push(limit, offset);
  const limitIndex = params.length - 1;
  const result = await pool.query(
    `SELECT u.id, u.clerk_user_id, u.created_at, e.plan, e.status, e.provider,
            e.selected_plan, e.trial_ends_at, e.current_period_ends_at,
            e.provider_subscription_id,
            COALESCE(SUM(d.text_messages), 0)::int AS text_messages,
            COALESCE(SUM(d.voice_seconds), 0)::int AS voice_seconds
     FROM users u
     LEFT JOIN entitlements e ON e.user_id = u.id
     LEFT JOIN daily_usage d ON d.user_id = u.id
     ${where}
     GROUP BY u.id, e.user_id
     ORDER BY u.created_at DESC
     LIMIT $${limitIndex} OFFSET $${limitIndex + 1}`,
    params,
  );
  const users = await Promise.all(result.rows.map(async (row) => {
    if (!row.clerk_user_id) return { ...row, email: null };
    try {
      const clerkUser = await clerkClient.users.getUser(row.clerk_user_id);
      return { ...row, email: clerkUser.primaryEmailAddress?.emailAddress ?? null };
    } catch {
      return { ...row, email: null };
    }
  }));
  res.json({ users, page, hasMore: users.length === limit });
});

router.post("/admin/users/:userId/manual-trial", requireOwner, async (req, res) => {
  const days = Number.parseInt(String(req.body?.days || "30"), 10);
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    res.status(400).json({ error: "Trial days must be between 1 and 365." });
    return;
  }
  const result = await pool.query(
    `UPDATE entitlements
     SET plan = 'premium', status = 'trialing', provider = NULL, selected_plan = 'manual',
         trial_ends_at = NOW() + ($1::int * INTERVAL '1 day'), current_period_ends_at = NULL
     WHERE user_id = $2
       AND provider IS NULL
       AND provider_subscription_id IS NULL
       AND pending_payment_id IS NULL
     RETURNING *`,
    [days, req.params.userId],
  );
  if (!result.rowCount) {
    res.status(409).json({ error: "Trial access cannot be changed because the user is missing or has provider-managed billing." });
    return;
  }
  const trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await grantSharedTrial(String(req.params.userId), trialEndsAt);
  res.json({ entitlement: result.rows[0], boxes: ["read_write", "audio_first"], trialEndsAt: trialEndsAt.toISOString() });
});

router.delete("/admin/users/:userId/manual-trial", requireOwner, async (req, res) => {
  const result = await pool.query(
    `UPDATE entitlements
     SET plan = 'free', status = 'active', provider = NULL, selected_plan = NULL,
         trial_ends_at = NULL, current_period_ends_at = NULL
     WHERE user_id = $1
       AND selected_plan = 'manual'
       AND status = 'trialing'
       AND provider IS NULL
       AND provider_subscription_id IS NULL
       AND pending_payment_id IS NULL`,
    [req.params.userId],
  );
  if (!result.rowCount) {
    res.status(409).json({ error: "Only an active manually granted trial can be revoked here." });
    return;
  }
  await pool.query(
    `DELETE FROM box_subscriptions
     WHERE user_id = $1 AND plan = 'trial' AND status = 'trialing'
       AND provider IS NULL AND provider_subscription_id IS NULL AND pending_payment_id IS NULL`,
    [req.params.userId],
  );
  res.status(204).send();
});

router.get("/admin/billing", requireOwner, async (_req, res) => {
  const [subscriptions, events] = await Promise.all([
    pool.query(
      `SELECT u.id AS user_id, u.clerk_user_id, b.box_id, b.plan, b.status, b.provider, b.selected_plan,
               b.trial_ends_at, b.current_period_ends_at, b.provider_customer_id,
               b.provider_subscription_id, b.pending_payment_id
        FROM box_subscriptions b JOIN users u ON u.id = b.user_id
        WHERE b.provider IS NOT NULL OR b.status <> 'inactive' OR b.plan <> 'free'
        ORDER BY COALESCE(b.trial_ends_at, b.current_period_ends_at) DESC NULLS LAST
       LIMIT 200`,
    ),
    pool.query("SELECT id, provider, event_type, processed_at FROM billing_events ORDER BY processed_at DESC LIMIT 100"),
  ]);
  res.json({ subscriptions: subscriptions.rows, events: events.rows });
});

router.get("/admin/settings", requireOwner, async (_req, res) => {
  const [privacy, terms, support] = await Promise.all([
    setting("legal/privacy"),
    setting("legal/terms"),
    setting("support"),
  ]);
  res.json({ privacy, terms, support });
});

router.put("/admin/settings/support", requireOwner, async (req, res) => {
  const value = req.body?.value;
  if (!validSupportContent(value)) {
    res.status(400).json({ error: "The submitted support settings are invalid." });
    return;
  }
  const row = (await pool.query(
    `INSERT INTO app_settings (key, value, updated_by)
     VALUES ('support', $1::jsonb, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by
     RETURNING value, updated_at`,
    [JSON.stringify(value), res.locals.ownerClerkUserId],
  )).rows[0];
  res.json({ key: "support", value: row.value, updatedAt: row.updated_at });
});

router.put("/admin/settings/:group/:name", requireOwner, async (req, res) => {
  const key = `${req.params.group}/${req.params.name}`;
  if (!MANAGED_SETTING_KEYS.has(key)) {
    res.status(404).json({ error: "Setting not found." });
    return;
  }
  const value = req.body?.value;
  const valid = key.startsWith("legal/") ? validLegalContent(value) : validSupportContent(value);
  if (!valid) {
    res.status(400).json({ error: "The submitted content is invalid or too long." });
    return;
  }
  const row = (await pool.query(
    `INSERT INTO app_settings (key, value, updated_by)
     VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by
     RETURNING value, updated_at`,
    [key, JSON.stringify(value), res.locals.ownerClerkUserId],
  )).rows[0];
  res.json({ key, value: row.value, updatedAt: row.updated_at });
});

export default router;