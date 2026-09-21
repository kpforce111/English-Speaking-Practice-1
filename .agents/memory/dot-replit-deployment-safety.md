---
name: .replit deployment safety
description: Preventing recurring duplicate deployment keys in this artifact-mode workspace.
---

Treat `.replit` as workspace-level configuration only. Artifact production settings belong in each artifact manifest and must be changed through the schema-validated artifact workflow. Never append, concatenate, or partially regenerate `.replit`; replace it atomically through the validated `.replit` replacement flow when a workspace-level edit is genuinely required.

**Why:** Historical pre-recovery checkpoints repeatedly show the complete `.replit` contents appended to themselves, creating duplicate `[deployment]` tables. Registering an ad-hoc named validation also caused the platform to rewrite `.replit`, so build and post-merge checks are safer than adding validation workflows for this file.

**How to apply:** Run `pnpm run validate:replit` before builds and after merges. Keep deployment edits out of `.replit`; use the artifact manifest tooling. If `.replit` itself must change, write a complete temporary TOML file and use the schema-validated replacement callback.