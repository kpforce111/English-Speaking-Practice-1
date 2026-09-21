#!/bin/bash
set -e
pnpm run validate:replit
pnpm install --frozen-lockfile
pnpm --filter db push
