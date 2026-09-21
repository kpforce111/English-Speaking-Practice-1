import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";

type AiTask = "conversation" | "voice" | "correction" | "translation";
type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AiTextRequest = {
  task: AiTask;
  input: string;
  messages: AiMessage[];
  maxCompletionTokens: number;
  json?: boolean;
};

const complexRequestPattern =
  /\b(advanced|essay|formal writing|detailed explanation|explain why|subjunctive|conditional|reported speech|academic|professional email|ielts|toefl)\b/i;

export const aiModels = {
  primary: process.env.AI_PRIMARY_MODEL?.trim() || "gpt-5-nano",
  secondary: process.env.AI_SECONDARY_MODEL?.trim() || "gpt-5.4-mini",
};

export function compactLearningContext(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  limit = 6,
) {
  return history
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    )
    .slice(-limit)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 1_000),
    }));
}

function needsSecondaryModel(task: AiTask, input: string) {
  if (input.trim().split(/\s+/).length > 120) return true;
  if (complexRequestPattern.test(input)) return true;
  return task === "correction" && input.trim().split(/\s+/).length > 80;
}

async function completeWithModel(
  model: string,
  request: AiTextRequest,
) {
  const completion = await openai.chat.completions.create({
    model,
    max_completion_tokens: request.maxCompletionTokens,
    reasoning_effort: "minimal",
    ...(request.json
      ? { response_format: { type: "json_object" as const } }
      : {}),
    messages: request.messages,
  });
  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) throw new Error(`AI model ${model} returned no text`);
  return content;
}

export async function routeAiText(request: AiTextRequest) {
  const useSecondary = needsSecondaryModel(request.task, request.input);
  const selectedModel = useSecondary ? aiModels.secondary : aiModels.primary;

  try {
    return await completeWithModel(selectedModel, request);
  } catch (error) {
    if (selectedModel === aiModels.secondary || aiModels.secondary === aiModels.primary) {
      throw error;
    }
    logger.warn(
      { err: error, primaryModel: aiModels.primary, secondaryModel: aiModels.secondary, task: request.task },
      "Primary AI model failed; routing request to secondary model",
    );
    return completeWithModel(aiModels.secondary, request);
  }
}