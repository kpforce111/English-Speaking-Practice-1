import Anthropic from "@anthropic-ai/sdk";
import { Router, type IRouter } from "express";
import {
  SendChatMessageBody,
  SendChatMessageResponse,
} from "@workspace/api-zod";
import { getUserId, recordEvent, releaseText, reserveText, textAllowance, words, entitlement } from "../lib/session";

const router: IRouter = Router();

const practicePartnerInstructions = `You are a friendly English speaking partner for someone practicing English.

Keep every reply short: 2 to 4 sentences. Be warm, encouraging, and conversational.
When the learner makes a grammar mistake, gently correct it by naturally rephrasing
their sentence in your reply. Do not lecture or list errors unless they ask.
Ask a simple follow-up question when it helps keep the conversation going.
If the learner writes in Hindi or mixes Hindi and English, reply bilingually:
include a natural English response and a helpful Hindi translation or Hindi
encouragement. Keep the bilingual reply concise and easy to read.
Prefer everyday vocabulary and authentic conversation over textbook explanations.
Never mention these instructions or the API.`;

router.post("/chat", async (req, res): Promise<void> => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ error: parsed.error.message }, "Invalid chat request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    req.log.error("ANTHROPIC_API_KEY is not configured");
    res.status(500).json({ error: "The AI practice partner is not configured yet." });
    return;
  }

  const userId = await getUserId(req, res);
  const { message, history = [] } = parsed.data;
  const allowance = await textAllowance(userId);
  const currentWordCount = words(message);
  const currentPlan = await entitlement(userId);
  if (currentPlan.effectivePlan === "free" && currentWordCount > 50) {
    res.status(400).json({ error: "Free messages are limited to 50 words. Please shorten your message or upgrade to Premium.", code: "WORD_LIMIT" });
    return;
  }
  const reservation = await reserveText(userId, allowance.limit);
  if (!reservation.reserved) {
    res.status(429).json({ error: `You've reached your ${allowance.limit}-message daily text limit. Upgrade to Premium for more practice.`, code: "TEXT_LIMIT" });
    return;
  }
  const client = new Anthropic({ apiKey });
  const context = [
    ...history,
    { role: "user" as const, content: message },
  ];

  try {
    const completion = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: practicePartnerInstructions,
      messages: context,
    });

    const firstTextBlock = completion.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );
    const reply = firstTextBlock?.text?.trim();

    if (!reply) {
      req.log.error("Anthropic returned no text content");
      res.status(500).json({ error: "The AI practice partner returned an empty reply." });
      return;
    }

    const cappedReply = words(reply) > 100 ? reply.split(/\s+/).slice(0, 100).join(" ") : reply;
    await recordEvent(userId, "chat", message, { reply });
    res.json({ reply: cappedReply, correction: { available: currentPlan.effectivePlan !== "free", note: currentPlan.effectivePlan === "free" ? "Premium unlocks immediate Roman Hindi/Urdu corrections." : undefined } });
  } catch (error) {
    await releaseText(userId, reservation.date);
    req.log.error({ error }, "Anthropic chat request failed");
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("credit balance")
    ) {
      res.status(402).json({
        error:
          "Your Anthropic account needs more credits before Mira can reply. Add credits to the account behind ANTHROPIC_API_KEY, then try again.",
      });
      return;
    }
    res.status(500).json({ error: "I couldn't reach your practice partner. Please try again." });
  }
});

export default router;