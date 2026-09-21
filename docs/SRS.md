# Software Requirements — English Speaking Practice

## AI Router

1. Client requests terminate at the Express backend.
2. The backend classifies each request as normal or complex.
3. Normal requests use `AI_PRIMARY_MODEL` (default `gpt-5-nano`).
4. Long or complex grammar/writing requests use `AI_SECONDARY_MODEL` (default `gpt-5.4-mini`).
5. A failed or empty primary response is retried once with the secondary model.
6. Chat, voice reply, correction, and translation routes share the same router.
7. Model and provider credentials are never returned to clients.

## Context and token limits

- The UI may retain conversation history locally for continuity.
- Requests to the provider contain no more than six recent learner/assistant messages.
- Each retained context message is capped at 1,000 characters.
- System prompts and completion limits remain concise and task-specific.

## Home practice flow

- `/home` displays one main control that links directly to `/voice`.
- The landing page uses the same single practice entry.
- The destination implements the spoken **Speak → Correct → Repeat** flow.

## Box-specific billing

- Stable box IDs are `read_write` and `audio_first`.
- `box_subscriptions` uses `(user_id, box_id)` as its primary key.
- Checkout requests require a box ID, provider, and billing period.
- Stripe and Razorpay metadata include the box ID and webhooks verify ownership against the matching user-and-box row.
- Provider price identifiers are separate per box and period.
- The shared 2-day free trial creates trial access for both boxes once per user.
- Paid access, renewal, and cancellation remain independent for each box.