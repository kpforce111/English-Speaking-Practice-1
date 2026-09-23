import crypto from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Router, type IRouter } from "express";
import { clerkClient } from "@clerk/express";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { authenticatedClerkUserId, getUserId, entitlement, requireBoxAccess, words, recordEvent, reserveVoice, releaseVoice } from "../lib/session";
import { pool } from "@workspace/db";
import { ensureCompatibleFormat, speechToText, textToSpeech } from "@workspace/integrations-openai-ai-server/audio";
import { compactLearningContext, routeAiText } from "../lib/aiRouter";
import {
  learningBoxes,
  parseLearningBoxId,
  sharedTrialState,
  strongestLogicalRow,
} from "../lib/boxSubscriptions";

const router: IRouter = Router();
const connectors = new ReplitConnectors();
const scenarios = ["job-interview", "office", "shopping", "travel", "doctor", "customer-service", "bpo", "daily-life"] as const;
const levels = ["beginner", "intermediate", "advanced"] as const;
const plans = {
  start_zero: {
    monthly: { amountPaise: 34900, label: "Monthly: ₹349/month — cancel anytime." },
    quarterly: { amountPaise: 89900, label: "Quarterly: ₹899 / 3 months (Save 14%) — cancel anytime." },
    yearly: { amountPaise: 299900, label: "Yearly: ₹2,999 / 12 months (Save 28%, Best Value) — cancel anytime." },
  },
  advanced: {
    monthly: { amountPaise: 39900, label: "Monthly: ₹399/month — cancel anytime." },
    quarterly: { amountPaise: 99900, label: "Quarterly: ₹999 / 3 months (Save 17%) — cancel anytime." },
    yearly: { amountPaise: 349900, label: "Yearly: ₹3,499 / 12 months (Save 27%, Best Value) — cancel anytime." },
  },
} as const;

const listPlans = (boxId: keyof typeof plans) =>
  Object.entries(plans[boxId]).map(([id, value]) => ({ id, ...value, bestValue: id === "yearly" }));

function activePaymentGateway() {
  const gateway = String(process.env.PAYMENT_GATEWAY || "inactive").trim().toLowerCase();
  return gateway === "phonepe" ? gateway : "inactive";
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

function audioInputFailure(res: import("express").Response, error: unknown) {
  const missingTool = error instanceof Error && "code" in error && error.code === "ENOENT";
  res.status(missingTool ? 503 : 400).json({
    error: missingTool ? "Audio processing is temporarily unavailable." : error instanceof Error ? error.message : "Invalid audio payload",
    code: missingTool ? "AUDIO_TOOL_UNAVAILABLE" : "INVALID_AUDIO",
  });
}

async function voiceModel(input: Buffer, format: "wav" | "mp3", history: Array<{ role: "user" | "assistant"; content: string }>) {
  const userTranscript = await speechToText(input, format);
  const assistantTranscript = await routeAiText({
    task: "voice",
    input: userTranscript,
    maxCompletionTokens: 220,
    messages: [
      { role: "system", content: "You are Rllora, a warm English teacher. Keep replies under 100 words, correct one important mistake gently, and explain briefly in Roman Hindi or Urdu when helpful. Speak naturally and encourage the learner." },
      ...compactLearningContext(history),
      { role: "user", content: userTranscript },
    ],
  });
  const audioResponse = await textToSpeech(assistantTranscript, "alloy", "mp3");
  if (!audioResponse.length) throw new Error("Speech model returned no audio");
  return { userTranscript, assistantTranscript, audioResponse };
}

async function usage(userId: string) {
  const date = new Date().toISOString().slice(0, 10);
  await pool.query("INSERT INTO daily_usage (user_id, usage_date) VALUES ($1, $2) ON CONFLICT (user_id, usage_date) DO NOTHING", [userId, date]);
  return { date, row: (await pool.query("SELECT * FROM daily_usage WHERE user_id = $1 AND usage_date = $2", [userId, date])).rows[0] };
}

async function translateOrCorrect(instruction: string, content: string) {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) throw new Error("AI provider is not configured");
  const text = await routeAiText({
    task: /translat/i.test(instruction) ? "translation" : "correction",
    input: content,
    maxCompletionTokens: 500,
    json: true,
    messages: [
      { role: "system", content: "You are an English teacher for Indian learners. Understand English, Hindi, Urdu, and Roman Hindi/Urdu. Return concise valid JSON only." },
      { role: "user", content: `${instruction}\nText: ${content}` },
    ],
  });
  try { return JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")); } catch { return { text }; }
}

router.get("/session", async (req, res) => {
  const userId = await getUserId(req, res);
  const signedIn = Boolean(authenticatedClerkUserId(req));
  const current = await entitlement(userId);
  const today = await usage(userId);
  res.json({ userId, signedIn, plan: current.effectivePlan, status: current.effectiveStatus, providerStatus: current.status, usage: { textMessages: today.row.text_messages, voiceSeconds: today.row.voice_seconds }, limits: { freeTextMessages: 10, premiumTextMessages: 100, freeWords: 50, premiumVoiceSeconds: 900 } });
});

router.get("/account/export", async (req, res) => {
  if (!authenticatedClerkUserId(req)) { res.status(401).json({ error: "Sign in to export your account." }); return; }
  const userId = await getUserId(req, res);
  const [account, subscription, boxSubscriptions, usageRows, progressRows, eventRows] = await Promise.all([
    pool.query("SELECT id, created_at, razorpay_customer_id FROM users WHERE id = $1", [userId]),
    pool.query("SELECT * FROM entitlements WHERE user_id = $1", [userId]),
    pool.query("SELECT * FROM box_subscriptions WHERE user_id = $1 ORDER BY box_id", [userId]),
    pool.query("SELECT * FROM daily_usage WHERE user_id = $1 ORDER BY usage_date", [userId]),
    pool.query("SELECT * FROM lesson_progress WHERE user_id = $1 ORDER BY updated_at", [userId]),
    pool.query("SELECT id, kind, content, metadata, duration_seconds, created_at FROM practice_events WHERE user_id = $1 ORDER BY created_at", [userId]),
  ]);
  res.setHeader("Content-Disposition", "attachment; filename=rllora-account-data.json");
  res.json({ exportedAt: new Date().toISOString(), account: account.rows[0], entitlement: subscription.rows[0], boxSubscriptions: boxSubscriptions.rows, dailyUsage: usageRows.rows, lessonProgress: progressRows.rows, practiceEvents: eventRows.rows });
});

router.delete("/account", async (req, res) => {
  const clerkUserId = authenticatedClerkUserId(req);
  if (!clerkUserId) { res.status(401).json({ error: "Sign in to delete your account." }); return; }
  const userId = await getUserId(req, res);
  const current = await entitlement(userId);
  if (current.provider_subscription_id && ["active", "trialing", "cancel_pending"].includes(String(current.status))) {
    res.status(409).json({ error: "Cancel your subscription and wait for Premium access to end before deleting your account.", code: "ACTIVE_SUBSCRIPTION" });
    return;
  }
  const client = await pool.connect();
  try {
    await clerkClient.users.deleteUser(clerkUserId);
    await client.query("BEGIN");
    await client.query("DELETE FROM practice_events WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM daily_usage WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM lesson_progress WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM box_subscriptions WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM entitlements WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM device_sessions WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM users WHERE id = $1", [userId]);
    await client.query("COMMIT");
    res.status(204).send();
  } catch (error) {
    await client.query("ROLLBACK");
    req.log.error({ error }, "account deletion failed");
    res.status(502).json({ error: "Account deletion could not be completed." });
  } finally {
    client.release();
  }
});

router.post("/trial/start", async (req, res): Promise<void> => {
  if (!authenticatedClerkUserId(req)) {
    res.status(401).json({ error: "Sign in before purchasing your ₹5 trial.", code: "SIGN_IN_REQUIRED" });
    return;
  }
  res.status(503).json({
    error: "The ₹5 two-day trial is unavailable until payment checkout is approved. No trial access has been activated and no payment has been taken.",
    code: "PAYMENTS_INACTIVE",
  });
});

router.get("/subscription", async (req, res) => {
  const userId = await getUserId(req, res);
  const rows = await pool.query("SELECT * FROM box_subscriptions WHERE user_id = $1 ORDER BY box_id", [userId]);
  const subscriptions = (["start_zero", "advanced"] as const).map((boxId) => {
    const row = strongestLogicalRow(rows.rows, boxId);
    if (!row) return {
      boxId, box: learningBoxes[boxId], provider: null, plan: "free", selectedPlan: null,
      status: "expired", providerStatus: "inactive", providerSubscriptionId: null,
      trialEndsAt: null, currentPeriodEndsAt: null, cancelPending: false,
    };
    return {
      boxId, box: learningBoxes[boxId],
      provider: row.provider,
      plan: row.effectivePlan,
      selectedPlan: row.selected_plan,
      status: row.effectiveStatus,
      providerStatus: row.status,
      providerSubscriptionId: row.provider_subscription_id,
      trialEndsAt: row.trial_ends_at,
      currentPeriodEndsAt: row.current_period_ends_at,
      cancelPending: row.status === "cancel_pending",
    };
  });
  const trialState = await sharedTrialState(userId);
  res.json({
    subscriptions,
    trialUsed: trialState.used,
    activeTrialEndsAt: trialState.activeTrialEndsAt?.toISOString() || null,
    status: subscriptions.length ? "available" : "none",
  });
});

router.post("/subscription/cancel", async (req, res) => {
  const userId = await getUserId(req, res);
  const boxId = parseLearningBoxId(req.body?.boxId);
  if (!boxId) { res.status(400).json({ error: "boxId must be start_zero or advanced" }); return; }
  const rows = (await pool.query("SELECT * FROM box_subscriptions WHERE user_id = $1", [userId])).rows;
  const current = strongestLogicalRow(rows, boxId);
  if (!current || !current.provider || !current.provider_subscription_id || current.effectivePlan === "free") {
    res.status(404).json({ error: "No active subscription found.", code: "SUBSCRIPTION_NOT_FOUND" });
    return;
  }
  if (current.status === "cancel_pending") {
    res.status(409).json({ error: "Subscription cancellation is already pending.", code: "CANCELLATION_PENDING" });
    return;
  }
  res.status(503).json({ error: "Subscription cancellation will be available after PhonePe approval and integration.", code: "PHONEPE_PENDING" });
});

router.post("/translate", async (req, res) => {
  const userId = await requireBoxAccess(req, res, "advanced"); if (!userId) return;
  const { text, direction = "english-to-roman-hindi" } = req.body || {};
  if (typeof text !== "string" || !text.trim()) { res.status(400).json({ error: "text is required" }); return; }
  if (!["english-to-roman-hindi", "roman-hindi-to-english"].includes(direction)) { res.status(400).json({ error: "Invalid translation direction" }); return; }
  try {
    const result = await translateOrCorrect(`Translate ${direction === "roman-hindi-to-english" ? "Roman Hindi/Urdu to natural English" : "English to natural Roman Hindi/Urdu"}. Return {"translation": "...","notes":"..."}.`, text);
    if (typeof result.translation !== "string" || !result.translation.trim()) throw new Error("Translation provider returned no translation");
    await recordEvent(userId, "translation", text, { direction });
    res.json({ translation: result.translation.trim(), notes: typeof result.notes === "string" ? result.notes : "" });
  } catch (error) { req.log.error({ error }, "translation failed"); res.status(503).json({ error: "Translation is temporarily unavailable." }); }
});

router.post("/correct", async (req, res) => {
  const userId = await requireBoxAccess(req, res, "advanced"); if (!userId) return;
  const { text, mode = "soft" } = req.body || {};
  if (typeof text !== "string" || !text.trim()) { res.status(400).json({ error: "text is required" }); return; }
  try {
    const result = await translateOrCorrect(`Correct the English gently in ${mode === "strict" ? "strict exam/interview style" : "soft friendly style"}. Return {"isCorrect":true,"corrected":"...","explanation":"Roman Hindi/Urdu explanation when useful","severity":"minor|major|none"}.`, text);
    await recordEvent(userId, "correction", text, { result, mode });
    res.json(result);
  } catch (error) { req.log.error({ error }, "correction failed"); res.status(503).json({ error: "Correction is temporarily unavailable." }); }
});

router.post("/voice", async (req, res) => {
  const userId = await requireBoxAccess(req, res, "advanced"); if (!userId) return;
  const { audioBase64, mimeType = "audio/webm", scenario = "daily-life", history = [] } = req.body || {};
  let decoded: { input: Buffer; seconds: number };
  try {
    decoded = await decodedAudio(audioBase64, mimeType);
  } catch (error) { audioInputFailure(res, error); return; }
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

router.post("/speech/transcribe", async (req, res) => {
  const boxId = parseLearningBoxId(req.body?.boxId);
  if (!boxId) { res.status(400).json({ error: "boxId must be start_zero or advanced" }); return; }
  const userId = await requireBoxAccess(req, res, boxId); if (!userId) return;
  let decoded: { input: Buffer; seconds: number };
  try { decoded = await decodedAudio(req.body?.audioBase64, req.body?.mimeType); }
  catch (error) { audioInputFailure(res, error); return; }
  const reservation = await reserveVoice(userId, decoded.seconds);
  if (!reservation.reserved) { res.status(429).json({ error: "You've used your 15-minute voice limit for today.", code: "VOICE_LIMIT" }); return; }
  try {
    const compatible = await ensureCompatibleFormat(decoded.input);
    const transcript = (await speechToText(compatible.buffer, compatible.format)).trim();
    if (!transcript) { res.status(422).json({ error: "No speech was detected. Please try again." }); await releaseVoice(userId, reservation.date, decoded.seconds); return; }
    await recordEvent(userId, "speech_transcription", transcript, { boxId }, decoded.seconds);
    res.json({ transcript, secondsUsed: decoded.seconds });
  } catch (error) {
    await releaseVoice(userId, reservation.date, decoded.seconds);
    req.log.error({ error }, "speech transcription failed");
    res.status(503).json({ error: "Speech recognition is temporarily unavailable." });
  }
});

router.post("/pronunciation", async (req, res) => {
  const userId = await requireBoxAccess(req, res, "advanced"); if (!userId) return;
  if (typeof req.body?.text !== "string" || !req.body.text.trim()) { res.status(400).json({ error: "text is required for pronunciation scoring" }); return; }
  let decoded: { input: Buffer; seconds: number };
  try { decoded = await decodedAudio(req.body?.audioBase64, req.body?.mimeType || "audio/webm"); }
  catch (error) { audioInputFailure(res, error); return; }
  const reservation = await reserveVoice(userId, decoded.seconds);
  if (!reservation.reserved) { res.status(429).json({ error: "You've used your 15-minute Premium voice limit for today.", code: "VOICE_LIMIT" }); return; }
  try {
    const mimeType = String(req.body?.mimeType || "audio/webm").split(";")[0].trim().toLowerCase();
    const audioFormat = mimeType === "audio/mpeg" ? "mp3" : mimeType.replace("audio/", "").replace("x-", "");
    const body = JSON.stringify({
      audio_base64: req.body?.audioBase64 || "",
      audio_format: audioFormat,
      expected_text: req.body.text.trim(),
    });
    const endpoint = process.env.RAPIDAPI_LANGUAGE_CONFIDENCE_URL;
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    const upstream = rapidApiKey && endpoint
      ? await fetch(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-rapidapi-key": rapidApiKey,
            ...(process.env.RAPIDAPI_LANGUAGE_CONFIDENCE_HOST ? { "x-rapidapi-host": process.env.RAPIDAPI_LANGUAGE_CONFIDENCE_HOST } : {}),
          },
          body,
        })
      : await connectors.proxy("rapidapi", "/speech-assessment/scripted/us", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body,
    });
    if (!upstream.ok) {
      await releaseVoice(userId, reservation.date, decoded.seconds);
      const upstreamBody = await upstream.text();
      req.log.error({ status: upstream.status, body: upstreamBody.slice(0, 500) }, "pronunciation provider returned an error");
      const code = upstream.status === 401 || upstream.status === 403
        ? "PRONUNCIATION_PROVIDER_AUTH"
        : upstream.status === 429
          ? "PRONUNCIATION_PROVIDER_LIMIT"
          : "PRONUNCIATION_PROVIDER_ERROR";
      res.status(502).json({ error: "Pronunciation scoring provider returned an error.", code });
      return;
    }
    const raw = await upstream.json() as Record<string, any>;
    const pronunciation = raw.pronunciation && typeof raw.pronunciation === "object" ? raw.pronunciation : {};
    const fluency = raw.fluency && typeof raw.fluency === "object" ? raw.fluency : {};
    const wordsResult = Array.isArray(pronunciation.words) ? pronunciation.words : Array.isArray(raw.words) ? raw.words : Array.isArray(raw.word_scores) ? raw.word_scores : [];
    const normalizedWords = wordsResult.map((item: any) => ({
      word: String(item.word_text || item.word || item.text || ""),
      score: Number(item.word_score ?? item.accuracy ?? item.score ?? item.confidence ?? 0),
      correct: Number(item.word_score ?? item.accuracy ?? item.score ?? item.confidence ?? 0) >= 70,
    }));
    const accuracy = Number(pronunciation.overall_score ?? raw.accuracy ?? raw.overall_accuracy ?? (normalizedWords.length ? normalizedWords.reduce((sum: number, item: { score: number }) => sum + item.score, 0) / normalizedWords.length : 0));
    const fluencyScore = Number(fluency.overall_score ?? raw.fluency_score ?? accuracy);
    const fluencyFeedback = Object.values(fluency)
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => item.feedback_text)
      .find((item): item is string => typeof item === "string" && Boolean(item));
    const result = {
      accuracyScore: Math.round(accuracy),
      fluencyScore: Math.round(fluencyScore),
      words: normalizedWords,
      feedback: fluencyFeedback || raw.feedback || "Practice this sentence once more and focus on the highlighted words.",
    };
    await recordEvent(userId, "pronunciation", req.body?.text, { result });
    res.json(result);
  } catch (error) { await releaseVoice(userId, reservation.date, decoded.seconds); req.log.error({ error }, "pronunciation request failed"); res.status(503).json({ error: "Pronunciation scoring is temporarily unavailable." }); }
});

router.get("/roleplays", async (req, res): Promise<void> => {
  const userId = await requireBoxAccess(req, res, "advanced"); if (!userId) return;
  res.json({ scenarios: scenarios.map((id) => ({ id, title: id.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()), prompt: `Act as a supportive ${id.replaceAll("-", " ")} partner. Keep turns short and correct mistakes.` })) });
});

router.post("/roleplays/:scenario", async (req, res) => {
  const userId = await requireBoxAccess(req, res, "advanced"); if (!userId) return;
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

router.get("/lessons", async (req, res): Promise<void> => {
  const userId = await requireBoxAccess(req, res, "advanced"); if (!userId) return;
  res.json({ lessons });
});
router.post("/lessons/:lessonId/attempt", async (req, res) => {
  const userId = await requireBoxAccess(req, res, "advanced"); if (!userId) return;
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
  const userId = await requireBoxAccess(req, res, "advanced"); if (!userId) return;
  const events = await pool.query("SELECT kind, COUNT(*)::int AS count, COALESCE(SUM(duration_seconds), 0)::int AS seconds FROM practice_events WHERE user_id = $1 GROUP BY kind ORDER BY kind", [userId]);
  const recent = await pool.query("SELECT COUNT(*)::int AS sentences, COALESCE(SUM(duration_seconds), 0)::int AS voice_seconds FROM practice_events WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'", [userId]);
  res.json({ events: events.rows, weekly: recent.rows[0] });
});

router.get("/weekly-report", async (req, res) => {
  const userId = await requireBoxAccess(req, res, "advanced"); if (!userId) return;
  const rows = await pool.query("SELECT kind, COUNT(*)::int AS count FROM practice_events WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days' GROUP BY kind", [userId]);
  res.json({ period: "last-7-days", highlights: rows.rows, message: "Consistency is progress. Keep one short practice session going each day." });
});

router.get("/plans", (_req, res) => res.json({
  trial: "₹5 for 2 days of access to both learning boxes. Available after payment setup; no automatic subscription afterward.",
  boxes: Object.values(learningBoxes),
  plans: listPlans("start_zero"),
  boxPlans: { start_zero: listPlans("start_zero"), advanced: listPlans("advanced") },
  features: ["Voice Conversation (15 minutes per day)", "Real-Time Correction", "Translation", "Pronunciation + Fluency Score", "Roleplays", "Daily Lessons", "Progress Tracking", "Weekly Report", "Strict Mode and Soft Mode"],
}));

router.get("/payment-options", (req, res) => {
  const country = String(req.query.country || "").toUpperCase();
  const gateway = activePaymentGateway();
  res.json({
    country,
    gateway,
    options: [],
    note: "Payments are temporarily unavailable while PhonePe approval is pending.",
  });
});

router.post("/checkout", async (req, res) => {
  if (!authenticatedClerkUserId(req)) { res.status(401).json({ error: "Sign in before starting Premium checkout.", code: "SIGN_IN_REQUIRED" }); return; }
  const { plan = "monthly" } = req.body || {};
  const gateway = activePaymentGateway();
  const boxId = parseLearningBoxId(req.body?.boxId);
  if (!boxId) { res.status(400).json({ error: "boxId must be start_zero or advanced" }); return; }
  if (!(plan in plans[boxId])) { res.status(400).json({ error: "plan must be monthly, quarterly, or yearly" }); return; }
  if (gateway === "inactive") {
    res.status(503).json({ error: "Payments are temporarily unavailable while PhonePe approval is pending.", code: "PAYMENTS_INACTIVE" });
    return;
  }
  if (gateway === "phonepe") {
    res.status(503).json({ error: "PhonePe approval is still pending. Payments are not live yet.", code: "PHONEPE_PENDING" });
    return;
  }
  res.status(503).json({ error: "Payments are temporarily unavailable while PhonePe approval is pending.", code: "PAYMENTS_INACTIVE" });
});



export default router;