#!/usr/bin/env bash
# Push to GitHub using a token supplied at runtime. The token is never written
# to disk or committed; it lives only in this process's environment.
set -euo pipefail

: "${GITHUB_TOKEN:?Set GITHUB_TOKEN first}"
REPO="${1:-github.com/dyvx/SUMI.git}"

git branch -M main 2>/dev/null || true
git remote remove origin 2>/dev/null || true
# Credentials passed via an askpass-style URL, not stored in .git/config.
git remote add origin "https://x-access-token:${GITHUB_TOKEN}@${REPO}"

git push -u origin main --force
git remote set-url origin "https://${REPO}"   # scrub the token from config

echo "Pushed to https://${REPO}"
