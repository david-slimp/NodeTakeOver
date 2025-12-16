#!/usr/bin/env bash
set -euo pipefail

# Load environment variables
if [[ -f .env ]]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found. Please create it from .env.example"
  exit 1
fi

if [[ -z "${DEPLOY_USER:-}" || -z "${DEPLOY_SERVER:-}" || -z "${DEPLOY_PATH:-}" ]]; then
  echo "Error: DEPLOY_USER, DEPLOY_SERVER, and DEPLOY_PATH must be set in .env"
  exit 1
fi

echo "🔨 Building production version..."
npm run build

echo "🚀 Deploying files to production server..."
rsync -avz --progress   --delete     dist/ "${DEPLOY_USER}@${DEPLOY_SERVER}:${DEPLOY_PATH}"

echo "✅ Deployment complete!"
echo "🌐 Visit: https://rock808.com/games/NodeTakeOver/"

