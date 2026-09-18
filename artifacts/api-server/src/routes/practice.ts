import crypto from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { getUserId, entitlement, requirePremium, words, recordEvent, reserveVoice, releaseVoice } from "../lib/session";
import { pool } from "@workspace/db";
import { ensureCompatibleFormat, speechToText } from "@workspace/integrations-openai-ai-server/audio";
import { openai } from "@workspace/integrations-openai-ai-server";
import Stripe from "stripe";

const router: IRouter = Router();
const scenarios = ["job-interview", "office", "shopping", "travel", "doctor", "customer-service", "bpo", "daily-life"] as const;
const levels = ["beginner", "intermediate", "advanced"] as const;
const plans = {
  monthly: { amountPaise: 39900, label: "Monthly: ₹399/month — cancel anytime." },
  quarterly: { amountPaise: 99900, label: "Quarterly: ₹999 / 3 months (Save 17%) — cancel anytime." },
  yearly: { amountPaise: 299900, label: "Yearly: ₹2,999 / 12 months (Save 37%, Best Value) — cancel anytime." },
} as const;

function requiredEnv(...keys: string[]) {
  return keys.filter((key) => !process.env[key]);
}

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

const audioTypes = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/x-wav"]);

async function decodedAudio(audioBase64: unknown, mimeType: unknown) {
  if (typeof audioBase64 !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(audioBase64) || !audioBase64.length) throw new Error("Invalid audio payload");
  const normalizedMime = typeof mimeType === "string" ? mimeType.split(";")[0].trim().toLowerCase() : "";
  if (!audioTypes.has(normalizedMime)) throw new Error("Unsupported audio MIME type");
  const input = Buffer.from(audioBase64, "base64");
  if (!input.length || input.length > 50 * 1024 * 1024) throw new Error("Audio must be non-empty and under 50MB");
  const path = join(tmpdir(), `rllora-${crypto.randomUUID()}`);
  await writeFile(path, input);
  try {
    const seconds = await new Promise<number>((resolve, reject) => {
      const child = spawn("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path]);
      let output = "";
      child.stdout.on("data", (data) => { output += String(data); });
      child.on("error", reject);
      child.on("close", (code) => {
        const value = Number.parseFloat(output.trim());
        if (code !== 0 || !Number.isFinite(value) || value <= 0) reject(new Error("Unable to derive exact audio duration"));
        else resolve(Math.ceil(value));
      });
    });
    return { input, seconds };
  } finally { await unlink(path).catch(() => undefined); }
}

async function voiceModel(input: Buffer, format: "wav" | "mp3", history: Array<{ role: "user" | "assistant"; content: string }>) {
  const userTranscript = await speechToText(input, format);
  const response = await openai.chat.completions.create({
    model: "gpt-audio",
    modalities: ["text", "audio"],
    audio: { voice: "alloy", format: "mp3" },
    messages: [
      { role: "system", content: "You are Rllora, a warm English teacher. Keep replies under 100 words, correct one important mistake gently, and explain briefly in Roman Hindi or Urdu when helpful. Speak naturally and encourage the learner." },
      ...history.slice(-8),
      { role: "user", content: userTranscript },
    ],
  });
  const message = response.choices[0]?.message as any;
  return { userTranscript, assistantTranscript: String(message?.audio?.transcript || message?.content || "").trim(), audioResponse: Buffer.from(message?.audio?.data || "", "base64") };
}

async function usage(userId: string) {
  const date = new Date().toISOString().slice(0, 10);
  await pool.query("INSERT INTO daily_usage (user_id, usage_date) VALUES ($1, $2) ON CONFLICT (user_id, usage_date) DO NOTHING", [userId, date]);
  return { date, row: (await pool.query("SELECT * FROM daily_usage WHERE user_id = $1 AND usage_date = $2", [userId, date])).rows[0] };
}

function aiClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  return key ? new Anthropic({ apiKey: key }) : null;
}

async function translateOrCorrect(instruction: string, content: string) {
  const client = aiClient();
  if (!client) throw new Error("AI provider is not configured");
  const result = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    system: "You are an English teacher for Indian learners. Understand English, Hindi, Urdu, and Roman Hindi/Urdu. Return concise valid JSON only.",
    messages: [{ role: "user", content: `${instruction}\nText: ${content}` }],
  });
  const text = result.content.find((block): block is Anthropic.TextBlock => block.type === "text")?.text || "{}";
  try { return JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")); } catch { return { text }; }
}

router.get("/session", async (req, res) => {
  const userId = await getUserId(req, res);
  const current = await entitlement(userId);
  const today = await usage(userId);
  res.json({ userId, plan: current.effectivePlan, status: current.effectiveStatus, providerStatus: current.status, usage: { textMessages: today.row.text_messages, voiceSeconds: today.row.voice_seconds }, limits: { freeTextMessages: 10, premiumTextMessages: 100, freeWords: 50, premiumVoiceSeconds: 900 } });
});

router.get("/subscription", async (req, res) => {
  const userId = await getUserId(req, res);
  const current = await entitlement(userId);
  if (!current.provider || !current.provider_subscription_id || current.effectivePlan === "free") {
    res.status(200).json({ subscription: null, status: "none" });
    return;
  }
  res.json({
    provider: current.provider,
    plan: current.effectivePlan,
    status: current.effectiveStatus,
    providerStatus: current.status,
    providerSubscriptionId: current.provider_subscription_id,
    trialEndsAt: current.trial_ends_at,
    currentPeriodEndsAt: current.current_period_ends_at,
    cancelPending: current.status === "cancel_pending",
  });
});

router.post("/subscription/cancel", async (req, res) => {
  const userId = await getUserId(req, res);
  const current = await entitlement(userId);
  if (!current.provider || !current.provider_subscription_id || current.effectivePlan === "free") {
    res.status(404).json({ error: "No active subscription found.", code: "SUBSCRIPTION_NOT_FOUND" });
    return;
  }
  if (current.status === "cancel_pending") {
    res.status(409).json({ error: "Subscription cancellation is already pending.", code: "CANCELLATION_PENDING" });
    return;
  }
  try {
    if (current.provider === "stripe") {
      const missing = requiredEnv("STRIPE_SECRET_KEY");
      if (missing.length) { res.status(503).json({ error: `Stripe is not configured. Missing: ${missing.join(", ")}`, code: "STRIPE_NOT_CONFIGURED", missing }); return; }
      const stripe = stripeClient();
      if (!stripe) { res.status(503).json({ error: "Stripe is not configured.", code: "STRIPE_NOT_CONFIGURED" }); return; }
      const subscription = await stripe.subscriptions.update(String(current.provider_subscription_id), { cancel_at_period_end: true });
      const end = subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : current.current_period_ends_at || current.trial_ends_at || null;
      await pool.query("UPDATE entitlements SET status = 'cancel_pending', current_period_ends_at = COALESCE($1, current_period_ends_at) WHERE user_id = $2", [end, userId]);
      res.json({ provider: "stripe", status: "cancel_pending", cancelAtPeriodEnd: true, accessUntil: end });
      return;
    }
    if (current.provider === "razorpay") {
      const missing = requiredEnv("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET");
      if (missing.length) { res.status(503).json({ error: `Razorpay is not configured. Missing: ${missing.join(", ")}`, code: "RAZORPAY_NOT_CONFIGURED", missing }); return; }
      const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
      const upstream = await fetch(`https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(String(current.provider_subscription_id))}/cancel`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({ cancel_at_cycle_end: 1 }),
      });
      if (!upstream.ok) {
        req.log.error({ status: upstream.status }, "Razorpay subscription cancellation failed");
        res.status(502).json({ error: "Razorpay could not schedule subscription cancellation." });
        return;
      }
      await pool.query("UPDATE entitlements SET status = 'cancel_pending' WHERE user_id = $1", [userId]);
      res.json({ provider: "razorpay", status: "cancel_pending", cancelAtCycleEnd: true, accessUntil: current.current_period_ends_at || current.trial_ends_at || null });
      return;
    }
    res.status(409).json({ error: "Subscription provider cannot be cancelled.", code: "UNSUPPORTED_PROVIDER" });
  } catch (error) {
    req.log.error({ error }, "subscription cancellation failed");
    res.status(502).json({ error: "The billing provider could not schedule cancellation." });
  }
});

router.post("/translate", async (req, res) => {
  const userId = await requirePremium(req, res); if (!userId) return;
  const { text, direction = "english-to-roman-hindi" } = req.body || {};
  if (typeof text !== "string" || !text.trim()) { res.status(400).json({ error: "text is required" }); return; }
  try {
    const result = await translateOrCorrect(`Translate ${direction === "roman-hindi-to-english" ? "Roman Hindi/Urdu to natural English" : "English to natural Roman Hindi/Urdu"}. Return {"translation": "...","notes":"..."}.`, text);
    await recordEvent(userId, "translation", text, { direction });
    res.json(result);
  } catch (error) { req.log.error({ error }, "translation failed"); res.status(503).json({ error: "Translation is temporarily unavailable." }); }
});

router.post("/correct", async (req, res) => {
  const userId = await requirePremium(req, res); if (!userId) return;
  const { text, mode = "soft" } = req.body || {};
  if (typeof text !== "string" || !text.trim()) { res.status(400).json({ error: "text is required" }); return; }
  try {
    const result = await translateOrCorrect(`Correct the English gently in ${mode === "strict" ? "strict exam/interview style" : "soft friendly style"}. Return {"isCorrect":true,"corrected":"...","explanation":"Roman Hindi/Urdu explanation when useful","severity":"minor|major|none"}.`, text);
    await recordEvent(userId, "correction", text, { result, mode });
    res.json(result);
  } catch (error) { req.log.error({ error }, "correction failed"); res.status(503).json({ error: "Correction is temporarily unavailable." }); }
});

router.post("/voice", async (req, res) => {
  const userId = await requirePremium(req, res); if (!userId) return;
  const { audioBase64, mimeType = "audio/webm", scenario = "daily-life", history = [] } = req.body || {};
  let decoded: { input: Buffer; seconds: number };
  try {
    decoded = await decodedAudio(audioBase64, mimeType);
  } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Invalid audio payload" }); return; }
  const reservation = await reserveVoice(userId, decoded.seconds);
  if (!reservation.reserved) { res.status(429).json({ error: "You've used your 15-minute Premium voice limit for today.", code: "VOICE_LIMIT" }); return; }
  try {
    const compatible = await ensureCompatibleFormat(decoded.input);
    const result = await voiceModel(compatible.buffer, compatible.format, Array.isArray(history) ? history : []);
    await recordEvent(userId, "voice", result.userTranscript, { mimeType, scenario, assistantTranscript: result.assistantTranscript }, decoded.seconds);
    res.json({ userTranscript: result.userTranscript, assistantTranscript: result.assistantTranscript, audioBase64: result.audioResponse.toString("base64"), audioMimeType: "audio/mpeg", secondsUsed: decoded.seconds });
  } catch (error) {
    await releaseVoice(userId, reservation.date, decoded.seconds);
    req.log.error({ error }, "voice conversation failed");
    res.status(503).json({ error: "Voice conversation is temporarily unavailable." });
  }
});

router.post("/pronunciation", async (req, res) => {
  const userId = await requirePremium(req, res); if (!userId) return;
  const endpoint = process.env.RAPIDAPI_LANGUAGE_CONFIDENCE_URL;
  if (!process.env.RAPIDAPI_KEY || !endpoint) { res.status(503).json({ error: "Pronunciation scoring requires RAPIDAPI_KEY and RAPIDAPI_LANGUAGE_CONFIDENCE_URL configuration.", code: "PRONUNCIATION_NOT_CONFIGURED" }); return; }
  if (typeof req.body?.text !== "string" || !req.body.text.trim()) { res.status(400).json({ error: "text is required for pronunciation scoring" }); return; }
  let decoded: { input: Buffer; seconds: number };
  try { decoded = await decodedAudio(req.body?.audioBase64, req.body?.mimeType || "audio/webm"); }
  catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Invalid audio payload" }); return; }
  const reservation = await reserveVoice(userId, decoded.seconds);
  if (!reservation.reserved) { res.status(429).json({ error: "You've used your 15-minute Premium voice limit for today.", code: "VOICE_LIMIT" }); return; }
  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-rapidapi-key": process.env.RAPIDAPI_KEY,
        ...(process.env.RAPIDAPI_LANGUAGE_CONFIDENCE_HOST ? { "x-rapidapi-host": process.env.RAPIDAPI_LANGUAGE_CONFIDENCE_HOST } : {}),
      },
      body: JSON.stringify({ text: req.body?.text || "", audioBase64: req.body?.audioBase64 || "" }),
    });
    if (!upstream.ok) { res.status(502).json({ error: "Language Confidence API returned an error." }); return; }
    const raw = await upstream.json() as Record<string, any>;
    const wordsResult = Array.isArray(raw.words) ? raw.words : Array.isArray(raw.word_scores) ? raw.word_scores : [];
    const normalizedWords = wordsResult.map((item: any) => ({
      word: String(item.word || item.text || ""),
      score: Number(item.accuracy ?? item.score ?? item.confidence ?? 0),
      correct: Number(item.accuracy ?? item.score ?? item.confidence ?? 0) >= 70,
    }));
    const accuracy = Number(raw.accuracy ?? raw.overall_accuracy ?? (normalizedWords.length ? normalizedWords.reduce((sum, item) => sum + item.score, 0) / normalizedWords.length : 0));
    const result = { accuracyScore: Math.round(accuracy), fluencyScore: Number(raw.fluency ?? raw.fluency_score ?? accuracy), words: normalizedWords, feedback: raw.feedback || "Practice this sentence once more and focus on the highlighted words." };
    await recordEvent(userId, "pronunciation", req.body?.text, { result });
    res.json(result);
  } catch (error) { await releaseVoice(userId, reservation.date, decoded.seconds); req.log.error({ error }, "pronunciation request failed"); res.status(503).json({ error: "Pronunciation scoring is temporarily unavailable." }); }
});

router.get("/roleplays", async (_req, res) => res.json({ scenarios: scenarios.map((id) => ({ id, title: id.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()), prompt: `Act as a supportive ${id.replaceAll("-", " ")} partner. Keep turns short and correct mistakes.` })) }));

router.post("/roleplays/:scenario", async (req, res) => {
  const userId = await requirePremium(req, res); if (!userId) return;
  const scenario = req.params.scenario as (typeof scenarios)[number];
  if (!scenarios.includes(scenario)) { res.status(400).json({ error: "Unknown roleplay scenario" }); return; }
  req.body = { ...req.body, scenario };
  const message = typeof req.body.message === "string" ? req.body.message : "";
  if (!message) { res.status(400).json({ error: "message is required" }); return; }
  try {
    const result = await translateOrCorrect(`Roleplay as a ${scenario.replaceAll("-", " ")} partner. Reply naturally in under 80 words. Return {"reply":"...","correction":"Roman Hindi/Urdu correction if needed"}.`, message);
    await recordEvent(userId, "roleplay", message, { scenario });
    res.json(result);
  } catch { res.status(503).json({ error: "Roleplay is temporarily unavailable." }); }
});

const lessons = levels.flatMap((level) => ["introductions", "daily-routines", "workplace-confidence", "travel-conversations"].map((topic, index) => ({
  id: `${level}-${topic}`, level, topic, title: `${topic.replaceAll("-", " ")} practice`, durationMinutes: 12 + (index % 3), steps: ["Warm up", "Listen and repeat", "Build your answer", "Reflect"],
})));

router.get("/lessons", async (_req, res) => res.json({ lessons }));
router.post("/lessons/:lessonId/attempt", async (req, res) => {
  const userId = await requirePremium(req, res); if (!userId) return;
  const lesson = lessons.find((item) => item.id === req.params.lessonId);
  if (!lesson) { res.status(404).json({ error: "Lesson not found" }); return; }
  const minutes = Math.min(15, Math.max(1, Number(req.body?.minutes) || lesson.durationMinutes));
  await pool.query(`INSERT INTO lesson_progress (user_id, lesson_id, level, completed_minutes, completed_at, updated_at)
    VALUES ($1, $2, $3, $4, CASE WHEN $4 >= 10 THEN NOW() ELSE NULL END, NOW())
    ON CONFLICT (user_id, lesson_id) DO UPDATE SET completed_minutes = lesson_progress.completed_minutes + $4, completed_at = CASE WHEN lesson_progress.completed_minutes + $4 >= 10 THEN NOW() ELSE lesson_progress.completed_at END, updated_at = NOW()`, [userId, lesson.id, lesson.level, minutes]);
  await recordEvent(userId, "lesson", lesson.id, { minutes });
  res.json({ lesson, minutes, completed: minutes >= 10 });
});

router.get("/progress", async (req, res) => {
  const userId = await requirePremium(req, res); if (!userId) return;
  const events = await pool.query("SELECT kind, COUNT(*)::int AS count, COALESCE(SUM(duration_seconds), 0)::int AS seconds FROM practice_events WHERE user_id = $1 GROUP BY kind ORDER BY kind", [userId]);
  const recent = await pool.query("SELECT COUNT(*)::int AS sentences, COALESCE(SUM(duration_seconds), 0)::int AS voice_seconds FROM practice_events WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'", [userId]);
  res.json({ events: events.rows, weekly: recent.rows[0] });
});

router.get("/weekly-report", async (req, res) => {
  const userId = await requirePremium(req, res); if (!userId) return;
  const rows = await pool.query("SELECT kind, COUNT(*)::int AS count FROM practice_events WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days' GROUP BY kind", [userId]);
  res.json({ period: "last-7-days", highlights: rows.rows, message: "Consistency is progress. Keep one short practice session going each day." });
});

router.get("/plans", (_req, res) => res.json({ trial: "₹5 for 2-Day Premium Trial — Get full Premium access for 2 days for ₹5. You can cancel anytime during the trial, or continue with Premium after.", plans: Object.entries(plans).map(([id, value]) => ({ id, ...value, bestValue: id === "yearly" })), features: ["Voice Conversation (15 minutes per day)", "Real-Time Correction", "Translation", "Pronunciation + Fluency Score", "Roleplays", "Daily Lessons", "Progress Tracking", "Weekly Report", "Strict Mode and Soft Mode"] }));

router.get("/payment-options", (req, res) => {
  const country = String(req.query.country || "").toUpperCase();
  const options = country === "IN"
    ? [{ id: "razorpay-upi", provider: "razorpay", label: "UPI Autopay", available: Boolean(process.env.RAZORPAY_KEY_ID) }]
    : [{ id: "stripe-card", provider: "stripe", label: "Card (Visa/Mastercard)", available: Boolean(process.env.STRIPE_SECRET_KEY) }, { id: "razorpay-upi", provider: "razorpay", label: "UPI Autopay (if supported by your bank)", available: Boolean(process.env.RAZORPAY_KEY_ID) }];
  res.json({ country, options, note: "UPI Autopay availability depends on the user's bank and Razorpay account." });
});

router.post("/checkout", async (req, res) => {
  const userId = await getUserId(req, res);
  const { provider, plan = "monthly", country = "IN" } = req.body || {};
  if (!plans[plan as keyof typeof plans]) { res.status(400).json({ error: "plan must be monthly, quarterly, or yearly" }); return; }
  const existingEntitlement = await entitlement(userId);
  if (existingEntitlement.effectiveStatus === "pending_payment") {
    res.status(409).json({ error: "A checkout payment is already pending.", code: "PAYMENT_PENDING" });
    return;
  }
  if (existingEntitlement.effectivePlan !== "free") {
    res.status(409).json({ error: "An active subscription already exists.", code: "SUBSCRIPTION_EXISTS" });
    return;
  }
  if (provider === "razorpay") {
    const env = requiredEnv("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", `RAZORPAY_PLAN_${String(plan).toUpperCase()}`);
    if (env.length) { res.status(503).json({ error: `Razorpay is not configured. Missing: ${env.join(", ")}`, code: "RAZORPAY_NOT_CONFIGURED", missing: env }); return; }
    const trialEnds = Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60;
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
    const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 500, currency: "INR", receipt: `trial_${userId}_${Date.now()}`, notes: { userId, plan, purpose: "2-day-premium-trial" } }),
    });
    if (!orderResponse.ok) { res.status(502).json({ error: "Razorpay could not create the ₹5 trial order." }); return; }
    const order = await orderResponse.json() as Record<string, any>;
    const upstream = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: process.env[`RAZORPAY_PLAN_${String(plan).toUpperCase()}`], total_count: 120, start_at: trialEnds, customer_notify: 1, notes: { userId, plan, country, trialAmountPaise: 500, paymentMethod: "upi_autopay_or_card" } }),
    });
    if (!upstream.ok) { req.log.error({ status: upstream.status }, "Razorpay subscription creation failed"); res.status(502).json({ error: "Razorpay could not create the subscription." }); return; }
    const subscription = await upstream.json() as Record<string, any>;
    await pool.query("UPDATE entitlements SET plan = 'free', provider = 'razorpay', selected_plan = $1, provider_subscription_id = $2, pending_payment_id = $3, status = 'pending_payment', trial_ends_at = NULL WHERE user_id = $4", [plan, subscription.id, order.id, userId]);
    res.json({ provider: "razorpay", keyId: process.env.RAZORPAY_KEY_ID, trialOrderId: order.id, trialAmountPaise: 500, subscriptionId: subscription.id, status: subscription.status, trialEndsAt: new Date(trialEnds * 1000).toISOString(), upiAutopaySupported: true });
    return;
  }
  if (provider === "stripe") {
    const priceKey = `STRIPE_PRICE_${String(plan).toUpperCase()}`;
    const missing = requiredEnv("STRIPE_SECRET_KEY", priceKey, "STRIPE_TRIAL_PRICE_ID");
    if (missing.length) { res.status(503).json({ error: `Stripe is not configured. Missing: ${missing.join(", ")}`, code: "STRIPE_NOT_CONFIGURED", missing }); return; }
    const stripe = stripeClient();
    if (!stripe) { res.status(503).json({ error: "Stripe is not configured.", code: "STRIPE_NOT_CONFIGURED" }); return; }
    const origin = `${req.protocol}://${req.get("host")}`;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_TRIAL_PRICE_ID!, quantity: 1 }, { price: process.env[priceKey]!, quantity: 1 }],
      subscription_data: { trial_period_days: 2, metadata: { userId, plan } },
      metadata: { userId, plan, trialAmountPaise: "500" },
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
      customer_creation: "always",
      allow_promotion_codes: true,
    });
    await pool.query("UPDATE entitlements SET plan = 'free', provider = 'stripe', selected_plan = $1, pending_payment_id = $2, provider_subscription_id = NULL, status = 'pending_payment', trial_ends_at = NULL WHERE user_id = $3", [plan, session.id, userId]);
    res.json({ provider: "stripe", checkoutUrl: session.url, sessionId: session.id, trialDays: 2 });
    return;
  }
  res.status(400).json({ error: "provider must be razorpay or stripe" });
});

router.post("/webhooks/:provider", async (req, res) => {
  const provider = req.params.provider;
  const raw = (req as typeof req & { rawBody?: Buffer }).rawBody;
  if (!raw) { res.status(400).json({ error: "Raw webhook body is required." }); return; }
  if (provider === "stripe") {
    const missing = requiredEnv("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET");
    if (missing.length) { res.status(503).json({ error: `Stripe webhook is not configured. Missing: ${missing.join(", ")}`, missing }); return; }
    try {
      const stripe = stripeClient()!;
      const signature = String(req.headers["stripe-signature"] || "");
      const event = stripe.webhooks.constructEvent(raw, signature, process.env.STRIPE_WEBHOOK_SECRET!);
      const inserted = await pool.query("INSERT INTO billing_events (id, provider, event_type) VALUES ($1, 'stripe', $2) ON CONFLICT DO NOTHING RETURNING id", [event.id, event.type]);
      if (!inserted.rowCount) { res.json({ received: true, duplicate: true }); return; }
      const object = event.data.object as any;
      const metadata = object.metadata || {};
      if (event.type === "checkout.session.completed") {
        if (object.payment_status === "paid" && typeof metadata.userId === "string" && typeof metadata.plan === "string" && object.id) {
          const pending = (await pool.query("SELECT * FROM entitlements WHERE user_id = $1 AND pending_payment_id = $2 AND status = 'pending_payment'", [metadata.userId, object.id])).rows[0];
          if (pending && object.subscription) {
            const subscription = await stripe.subscriptions.retrieve(String(object.subscription));
            const subscriptionMetadata = subscription.metadata || {};
            if (subscriptionMetadata.userId === metadata.userId && ["trialing", "active"].includes(subscription.status)) {
              const trialEnd = subscription.trial_end || Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60;
              const verifiedPeriodEnd = (subscription as any).current_period_end;
              await pool.query("UPDATE entitlements SET plan = $1, status = $2, provider_subscription_id = $3, provider_customer_id = $4, pending_payment_id = NULL, trial_ends_at = TO_TIMESTAMP($5), current_period_ends_at = CASE WHEN $6 THEN TO_TIMESTAMP($7) ELSE current_period_ends_at END WHERE user_id = $8 AND pending_payment_id = $9 AND status = 'pending_payment'",
                [metadata.plan, subscription.status === "trialing" ? "trialing" : "active", subscription.id, object.customer || null, trialEnd, Boolean(verifiedPeriodEnd), verifiedPeriodEnd || 0, metadata.userId, object.id]);
            }
          }
        }
        res.json({ received: true });
        return;
      }
      if (metadata.userId && event.type.startsWith("customer.subscription.")) {
        const owned = (await pool.query("SELECT 1 FROM entitlements WHERE user_id = $1 AND provider_subscription_id = $2 AND status <> 'pending_payment'", [metadata.userId, object.id])).rowCount === 1;
        if (!owned) { res.json({ received: true, ignored: "subscription_not_owned_or_unpaid" }); return; }
        const active = event.type !== "customer.subscription.deleted" && ["active", "trialing"].includes(object.status || "active");
        const pendingCancel = active && Boolean(object.cancel_at_period_end);
        await pool.query("UPDATE entitlements SET status = $1, plan = COALESCE($2, plan), provider_subscription_id = COALESCE($3, provider_subscription_id), provider_customer_id = COALESCE($4, provider_customer_id), current_period_ends_at = CASE WHEN $5 THEN TO_TIMESTAMP($6) ELSE current_period_ends_at END WHERE user_id = $7",
          [pendingCancel ? "cancel_pending" : (active ? (object.status === "trialing" ? "trialing" : "active") : "cancelled"), metadata.plan || null, object.id || null, object.customer || null, Boolean(object.current_period_end), object.current_period_end || 0, metadata.userId]);
      }
      res.json({ received: true });
    } catch (error) { req.log.warn({ error }, "invalid Stripe webhook"); res.status(400).json({ error: "Invalid Stripe webhook signature or payload." }); }
    return;
  }
  if (provider === "razorpay") {
    const missing = requiredEnv("RAZORPAY_WEBHOOK_SECRET");
    if (missing.length) { res.status(503).json({ error: `Razorpay webhook is not configured. Missing: ${missing.join(", ")}`, missing }); return; }
    const signature = String(req.headers["x-razorpay-signature"] || "");
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!).update(raw).digest("hex");
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) { res.status(400).json({ error: "Invalid Razorpay webhook signature." }); return; }
    const event = req.body as any;
    const eventId = String(req.headers["x-razorpay-event-id"] || crypto.createHash("sha256").update(raw).digest("hex"));
    const inserted = await pool.query("INSERT INTO billing_events (id, provider, event_type) VALUES ($1, 'razorpay', $2) ON CONFLICT DO NOTHING RETURNING id", [eventId, String(event?.event || "subscription.updated")]);
    if (!inserted.rowCount) { res.json({ received: true, duplicate: true }); return; }
    const eventName = String(event?.event || "");
    const orderEntity = event?.payload?.order?.entity;
    const paymentEntity = event?.payload?.payment?.entity;
    const paidOrderId = eventName === "order.paid" ? orderEntity?.id : (eventName === "payment.captured" ? paymentEntity?.order_id : null);
    if (paidOrderId && (eventName === "order.paid" || (eventName === "payment.captured" && Number(paymentEntity?.amount) === 500 && paymentEntity?.status === "captured"))) {
      const pending = (await pool.query("SELECT * FROM entitlements WHERE pending_payment_id = $1 AND status = 'pending_payment'", [String(paidOrderId)])).rows[0];
      let notes = orderEntity?.notes || {};
      if (eventName === "payment.captured" && pending) {
        const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET || ""}`).toString("base64");
        const orderLookup = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(String(paidOrderId))}`, { headers: { Authorization: `Basic ${auth}` } });
        if (orderLookup.ok) notes = ((await orderLookup.json()) as Record<string, any>).notes || {};
      }
      if (pending && notes.userId === pending.user_id && notes.purpose === "2-day-premium-trial") {
        const trialEnds = Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60;
        await pool.query("UPDATE entitlements SET plan = selected_plan, status = 'trialing', pending_payment_id = NULL, trial_ends_at = TO_TIMESTAMP($1) WHERE user_id = $2 AND pending_payment_id = $3 AND status = 'pending_payment'", [trialEnds, pending.user_id, String(paidOrderId)]);
      }
      res.json({ received: true });
      return;
    }
    const entity = event?.payload?.subscription?.entity;
    if (entity?.id) {
      const owned = (await pool.query("SELECT 1 FROM entitlements WHERE provider_subscription_id = $1 AND status <> 'pending_payment'", [entity.id])).rowCount === 1;
      if (owned) await pool.query("UPDATE entitlements SET status = $1 WHERE provider_subscription_id = $2", [entity.status === "active" ? "active" : entity.status, entity.id]);
    }
    res.json({ received: true });
    return;
  }
  res.status(400).json({ error: "Unknown billing provider." });
});

export default router;