#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
git pull --rebase origin main
npm ci || npm install
pm2 reload hotmangay18
