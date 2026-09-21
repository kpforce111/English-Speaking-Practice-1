---
name: Stripe connector billing sync
description: Why Stripe subscription state is reconciled through the connected account during authenticated app reads.
---

Use the Replit Stripe connection for checkout, cancellation, and subscription retrieval. Treat the Stripe webhook as optional and reconcile pending or active Stripe records when authenticated session/subscription data is read.

**Why:** The connected account supplies authenticated Stripe API access without exposing a direct API key, but it does not supply a webhook-signing secret. Direct reconciliation preserves verified provider state without making that secret a launch dependency.

**How to apply:** Keep provider metadata scoped to both user and learning box. Before granting or extending access, retrieve the Stripe Checkout Session or Subscription and verify both identifiers against the database row.