---
name: Learning-product entitlement boundaries
description: Durable subscription and trial rules for the two learning products.
---

Start from Zero and Advanced English Coach must enforce access independently on both direct routes and backend APIs. Legacy product IDs are compatibility aliases only; when duplicate legacy and canonical rows exist, use the strongest active logical entitlement.

**Why:** The products have separate post-trial subscriptions. A global premium check silently grants the wrong product, while canonical-only selection can hide an active legacy subscription. The user corrected the trial price: one explicit, one-time, two-day trial costs ₹5 and unlocks both products only after payment is verified.

**How to apply:** Any new learning route must name its product at the UI gate and API authorization layer. Never activate a trial through a free self-service path or imply automatic billing; after trial expiry, users explicitly choose one product and subscribe. Keep checkout unavailable until a compliant payment provider is ready.