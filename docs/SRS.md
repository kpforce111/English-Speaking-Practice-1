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