# Product Requirements — English Speaking Practice

## AI coaching and cost

- The Android/web client must call only the backend and must never call an LLM provider directly.
- The backend AI Router must choose the cheapest suitable model for each request.
- Normal conversation, corrections, vocabulary, grammar explanations, translation, voice replies, and daily practice use the primary model.
- Complex grammar, difficult or long writing, and primary-model failures may use the stronger secondary model.
- Model names are backend configuration (`AI_PRIMARY_MODEL` and `AI_SECONDARY_MODEL`) so clients do not change when models change.
- Provider credentials remain server-side.
- Only the compact Personal Learning Engine context needed for the current turn is sent to the provider, not the learner’s complete history.

### Pricing review

Pricing checked against official OpenAI API pricing on 2026-09-22:

| Model | Input / 1M tokens | Output / 1M tokens | Role |
| --- | ---: | ---: | --- |
| `gpt-5-nano` | $0.05 | $0.40 | Primary |
| `gpt-4o-mini` (legacy) | $0.15 | $0.60 | Replaced |
| `gpt-5.4-mini` | $0.75 | $4.50 | Complex/fallback |

These figures are a review snapshot, not a fixed runtime assumption. Recheck official pricing before production releases and change server configuration when a cheaper suitable model becomes available.

## Practice entry

- Home presents one primary practice action rather than six mode choices.
- Tapping it starts the core spoken loop directly: **Speak → Correct → Repeat**.
- Existing secondary capabilities remain available through their existing routes/navigation.

## Cost policy

- Use the cheapest production-grade option available in the current managed stack.
- Text coaching uses the cheap/fast primary model; the stronger model is limited to complex requests and fallback.
- Voice uses the lowest-cost supported managed audio models: `gpt-audio-mini` for TTS and `gpt-4o-mini-transcribe` for STT.
- Use the existing managed PostgreSQL database and autoscale hosting rather than adding paid infrastructure.
- Provider and model choices remain server-configurable; no client may hard-code an expensive provider.

## Learning boxes and subscriptions

- Box 1 is `read_write`: **For Those Who Can Read & Write**.
- Box 2 is `audio_first`: **For Those Who Cannot Read & Write**.
- The first trial gives 2 days of full access to both boxes at no charge.
- After the trial, each box has an independent subscription and provider tracking record.
- Each box currently offers Monthly ₹349, Quarterly ₹899, and Yearly ₹2,999.
- A user may subscribe to either box or both; changing or cancelling one box must not modify the other.