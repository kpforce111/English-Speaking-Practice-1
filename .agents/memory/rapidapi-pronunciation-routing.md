---
name: RapidAPI pronunciation routing
description: Why pronunciation assessment keeps a secure direct-key path alongside the RapidAPI connector.
---

The Scripted Speech Assessment integration should keep the direct RapidAPI secret path available rather than relying exclusively on the generic RapidAPI connector.

**Why:** In this workspace, authenticated connector proxy calls to the configured assessment path returned connector-level HTTP 500 errors, first `fetch failed` and later `ERR_TLS_CERT_ALTNAME_INVALID`, even when the host header was supplied. A securely stored RapidAPI key with the correct direct endpoint previously returned HTTP 200.

**How to apply:** For pronunciation-provider changes, preserve the direct-key path and verify with a real audio sample. Do not treat connector attachment alone as proof that upstream scoring works. If the direct endpoint is not configured, surface the scoring failure separately from the working voice conversation rather than fabricating a score.