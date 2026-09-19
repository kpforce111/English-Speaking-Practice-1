---
name: RapidAPI pronunciation routing
description: Why pronunciation assessment keeps a secure direct-key path alongside the RapidAPI connector.
---

The Scripted Speech Assessment integration should keep the direct RapidAPI secret path available rather than relying exclusively on the generic RapidAPI connector.

**Why:** In this workspace, authenticated connector proxy calls to the configured assessment path returned a connector-level HTTP 500 `fetch failed`, including when the correct host header was supplied. The same endpoint and payload succeeded with HTTP 200 through a securely stored RapidAPI key.

**How to apply:** For pronunciation-provider changes, preserve the direct-key path and verify with a real audio sample. Do not treat connector attachment alone as proof that upstream scoring works.