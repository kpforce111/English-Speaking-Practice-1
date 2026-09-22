import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { requireBoxAccess, recordEvent } from "../lib/session";

const router: IRouter = Router();

const curriculum = [
  { id: "apple", kind: "word", level: "level_0", picture: "apple", english: "Apple", explanation: "Seb", category: "everyday" },
  { id: "water", kind: "word", level: "level_0", picture: "water", english: "Water", explanation: "Paani", category: "everyday" },
  { id: "house", kind: "word", level: "level_0", picture: "house", english: "House", explanation: "Ghar", category: "everyday" },
  { id: "come", kind: "word", level: "level_0", picture: "come", english: "Come", explanation: "Aao", category: "action" },
  { id: "sit", kind: "word", level: "level_0", picture: "sit", english: "Sit", explanation: "Baitho", category: "action" },
  { id: "my-name-is", kind: "sentence", level: "level_1", english: "My name is...", explanation: "Mera naam ... hai", category: "introduction" },
  { id: "i-want-water", kind: "sentence", level: "level_1", english: "I want water.", explanation: "Mujhe paani chahiye", category: "restaurant" },
  { id: "i-am-hungry", kind: "sentence", level: "level_1", english: "I am hungry.", explanation: "Mujhe bhookh lagi hai", category: "daily-life" },
  { id: "how-much", kind: "sentence", level: "level_1", english: "How much?", explanation: "Kitne paise?", category: "shopping" },
  { id: "where-hotel", kind: "sentence", level: "level_1", english: "Where is the hotel?", explanation: "Hotel kahan hai?", category: "travel" },
] as const;

type Profile = { level: "level_0" | "level_1"; assessmentCompleted: boolean; sessionsCompleted: number };

async function profile(userId: string): Promise<Profile> {
  const row = (await pool.query("SELECT level, assessment_completed, sessions_completed FROM beginner_profiles WHERE user_id = $1", [userId])).rows[0];
  if (!row) {
    await pool.query("INSERT INTO beginner_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [userId]);
    return { level: "level_0", assessmentCompleted: false, sessionsCompleted: 0 };
  }
  return { level: row.level === "level_1" ? "level_1" : "level_0", assessmentCompleted: Boolean(row.assessment_completed), sessionsCompleted: Number(row.sessions_completed || 0) };
}

async function overview(userId: string) {
  const current = await profile(userId);
  const progress = await pool.query("SELECT item_id, kind, attempts, correct_attempts, mistake_count FROM beginner_item_progress WHERE user_id = $1 ORDER BY mistake_count DESC, updated_at ASC", [userId]);
  const weakIds = new Set(progress.rows.filter((row) => Number(row.mistake_count) > 0).map((row) => row.item_id));
  const toClientItem = (item: (typeof curriculum)[number]) => ({
    id: item.id,
    kind: item.kind,
    level: item.level,
    prompt: item.english,
    english: item.english,
    picture: { id: item.id, icon: "beginner-item", alt: item.english },
    meaning: item.explanation,
    explanation: item.explanation,
    category: item.category,
  });
  const revision = curriculum.filter((item) => weakIds.has(item.id)).slice(0, 3).map(toClientItem);
  const candidate = curriculum.find((item) => item.level === current.level && !progress.rows.some((row) => row.item_id === item.id && Number(row.correct_attempts) >= 2)) || curriculum.find((item) => item.level === current.level) || curriculum[0];
  const date = new Date().toISOString().slice(0, 10);
  const summary = (await pool.query("SELECT words_learned, sentences_practiced, conversations_practiced, pronunciation_mistakes, sentence_mistakes, weak_items FROM beginner_session_summaries WHERE user_id = $1 AND session_date = $2", [userId, date])).rows[0];
  return {
    profile: current,
    lesson: { title: "Today’s Practice", durationMinutes: 30, flow: ["Listen", "Understand", "Speak", "Repeat", "Correct", "Improve"], items: [toClientItem(candidate)], startItemId: candidate.id },
    revision,
    summary: summary ? { wordsLearned: summary.words_learned, sentencesPracticed: summary.sentences_practiced, conversationsPracticed: summary.conversations_practiced, pronunciationMistakes: summary.pronunciation_mistakes, sentenceMistakes: summary.sentence_mistakes, weakItems: summary.weak_items } : { wordsLearned: 0, sentencesPracticed: 0, conversationsPracticed: 0, pronunciationMistakes: 0, sentenceMistakes: 0, weakItems: [] },
  };
}

router.get("/beginner/overview", async (req, res): Promise<void> => {
  const userId = await requireBoxAccess(req, res, "start_zero");
  if (!userId) return;
  res.json(await overview(userId));
});

router.post("/beginner/assessment", async (req, res): Promise<void> => {
  const userId = await requireBoxAccess(req, res, "start_zero");
  if (!userId) return;
  const fields = ["wordRecognition", "listening", "repeating", "pronunciation", "sentenceUnderstanding", "alphabetRecognition"] as const;
  if (fields.some((field) => typeof req.body?.[field] !== "number" || req.body[field] < 0 || req.body[field] > 1)) {
    res.status(400).json({ error: "All six assessment scores must be numbers from 0 to 1." });
    return;
  }
  const results = Object.fromEntries(fields.map((field) => [field, req.body[field]]));
  const average = fields.reduce((sum, field) => sum + req.body[field], 0) / fields.length;
  const level = average >= 0.55 ? "level_1" : "level_0";
  await pool.query("INSERT INTO beginner_assessments (id, user_id, level, results) VALUES ($1, $2, $3, $4)", [crypto.randomUUID(), userId, level, JSON.stringify(results)]);
  await pool.query("INSERT INTO beginner_profiles (user_id, level, assessment_completed) VALUES ($1, $2, 1) ON CONFLICT (user_id) DO UPDATE SET level = EXCLUDED.level, assessment_completed = 1, updated_at = NOW()", [userId, level]);
  const current = await profile(userId);
  await recordEvent(userId, "beginner_assessment", level, { results });
  res.json(current);
});

router.post("/beginner/practice", async (req, res): Promise<void> => {
  const userId = await requireBoxAccess(req, res, "start_zero");
  if (!userId) return;
  const { itemId, kind, correct, pronunciationScore } = req.body || {};
  const validKinds = ["word", "sentence", "listening", "pronunciation", "conversation"];
  if (typeof itemId !== "string" || !itemId.trim() || !validKinds.includes(kind) || typeof correct !== "boolean") {
    res.status(400).json({ error: "itemId, kind, and correct are required." });
    return;
  }
  const item = curriculum.find((entry) => entry.id === itemId);
  if (!item) { res.status(404).json({ error: "Beginner curriculum item not found." }); return; }
  const mistake = !correct || (kind === "pronunciation" && typeof pronunciationScore === "number" && pronunciationScore < 70);
  await pool.query(
    `INSERT INTO beginner_item_progress (user_id, item_id, kind, attempts, correct_attempts, mistake_count, last_practiced_at, updated_at)
     VALUES ($1, $2, $3, 1, $4, $5, NOW(), NOW())
     ON CONFLICT (user_id, item_id) DO UPDATE SET attempts = beginner_item_progress.attempts + 1, correct_attempts = beginner_item_progress.correct_attempts + $4, mistake_count = beginner_item_progress.mistake_count + $5, last_practiced_at = NOW(), updated_at = NOW()`,
    [userId, itemId, kind, mistake ? 0 : 1, mistake ? 1 : 0],
  );
  const date = new Date().toISOString().slice(0, 10);
  const words = kind === "word" ? 1 : 0;
  const sentences = kind === "sentence" ? 1 : 0;
  const conversations = kind === "conversation" ? 1 : 0;
  const pronunciationMistakes = kind === "pronunciation" && mistake ? 1 : 0;
  const sentenceMistakes = kind === "sentence" && mistake ? 1 : 0;
  await pool.query(
    `INSERT INTO beginner_session_summaries (id, user_id, session_date, words_learned, sentences_practiced, conversations_practiced, pronunciation_mistakes, sentence_mistakes, weak_items)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id, session_date) DO UPDATE SET words_learned = beginner_session_summaries.words_learned + $4, sentences_practiced = beginner_session_summaries.sentences_practiced + $5, conversations_practiced = beginner_session_summaries.conversations_practiced + $6, pronunciation_mistakes = beginner_session_summaries.pronunciation_mistakes + $7, sentence_mistakes = beginner_session_summaries.sentence_mistakes + $8, weak_items = CASE WHEN $9::jsonb = '[]'::jsonb THEN beginner_session_summaries.weak_items ELSE beginner_session_summaries.weak_items || $9::jsonb END`,
    [crypto.randomUUID(), userId, date, words, sentences, conversations, pronunciationMistakes, sentenceMistakes, JSON.stringify(mistake ? [itemId] : [])],
  );
  await pool.query("UPDATE beginner_profiles SET sessions_completed = sessions_completed + 1, updated_at = NOW() WHERE user_id = $1", [userId]);
  await recordEvent(userId, "beginner_practice", item.english, { itemId, kind, correct, pronunciationScore });
  res.json(await overview(userId));
});

export default router;