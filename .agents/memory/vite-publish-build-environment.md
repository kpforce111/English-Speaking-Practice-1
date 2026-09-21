---
name: Vite publish-build environment
description: Build-time environment behavior for Vite artifacts during Replit publishing.
---

Vite artifact configs must require `PORT` and `BASE_PATH` only for serve/preview mode. During `vite build`, use artifact-appropriate defaults.

**Why:** Replit's root publish pre-build runs outside each artifact's service context, so values declared under `services.env` are not present even though they are correctly injected when the artifact service runs.

**How to apply:** Use Vite's config `command` to distinguish `build` from `serve`. Keep strict validation for servers, but default the build base path and an unused build-only port.