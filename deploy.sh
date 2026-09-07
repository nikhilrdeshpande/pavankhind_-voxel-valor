#!/bin/bash
# Deploy Pavankhind to pavankhind.bobhata.com
#
# Builds locally, rsyncs the dist/ artifact to a timestamped release dir on the
# server, and atomically swaps a `current` symlink. Rollback = repoint the
# symlink at the previous release.
#
# Server prerequisites (one-time, as root):
#   useradd -m -s /bin/bash deploy
#   mkdir -p /var/www/pavankhind.bobhata.com/releases
#   chown -R deploy:deploy /var/www/pavankhind.bobhata.com
#   # install deploy's SSH public key in /home/deploy/.ssh/authorized_keys
#   # point nginx root at /var/www/pavankhind.bobhata.com/current
#
# Local prerequisites:
#   # pin the server host key once (no blind StrictHostKeyChecking=no):
#   ssh-keyscan -H pavankhind.bobhata.com >> ~/.ssh/known_hosts
#
# Usage: ./deploy.sh           deploy HEAD
#        ./deploy.sh rollback  swap back to the previous release

set -euo pipefail

SERVER="${DEPLOY_SERVER:-deploy@pavankhind.bobhata.com}"
BASE="/var/www/pavankhind.bobhata.com"
KEEP_RELEASES=5

if [[ "${1:-}" == "rollback" ]]; then
  ssh "$SERVER" bash -s <<REMOTE
set -euo pipefail
cd "$BASE"
prev=\$(ls -1dt releases/*/ | sed -n 2p)
[[ -n "\$prev" ]] || { echo "No previous release to roll back to"; exit 1; }
ln -sfn "\$PWD/\${prev%/}" current
echo "Rolled back to \${prev%/}"
REMOTE
  exit 0
fi

echo "🔨 Building locally..."
npm ci
npx tsc --noEmit
npm run build

RELEASE="$(date +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD)"

echo "📦 Uploading release $RELEASE..."
rsync -az --delete dist/ "$SERVER:$BASE/releases/$RELEASE/"

echo "🔁 Activating..."
ssh "$SERVER" bash -s <<REMOTE
set -euo pipefail
cd "$BASE"
ln -sfn "\$PWD/releases/$RELEASE" current
# prune old releases beyond the last $KEEP_RELEASES
ls -1dt releases/*/ | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf
REMOTE

echo ""
echo "✅ Deployed $RELEASE"
echo "🌐 https://pavankhind.bobhata.com"
