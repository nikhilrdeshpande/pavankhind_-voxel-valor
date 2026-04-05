#!/bin/bash
# Deploy Pavankhind to pavankhind.bobhata.com
# Usage: ./deploy.sh

set -e

SERVER="root@150.241.246.206"
DEPLOY_PATH="/var/www/pavankhind.bobhata.com"
SSH_KEY="/root/.ssh/pavankhind_deploy"

echo "🏰 Deploying Pavankhind to pavankhind.bobhata.com..."

ssh -o StrictHostKeyChecking=no $SERVER bash -s << 'REMOTE'
set -e
cd /var/www/pavankhind.bobhata.com

echo "📥 Pulling latest code..."
GIT_SSH_COMMAND='ssh -i /root/.ssh/pavankhind_deploy -o StrictHostKeyChecking=no' git pull

echo "📦 Installing dependencies..."
npm install --production=false

echo "🔨 Building..."
npm run build

echo ""
echo "✅ Deploy complete!"
echo "🌐 https://pavankhind.bobhata.com"
REMOTE
