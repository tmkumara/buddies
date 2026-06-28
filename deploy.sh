#!/bin/bash
# deploy.sh — Production deployment script for giftbox-oms on buddiescraft.duckdns.org
# Usage: bash deploy.sh
#
# Safety rules (do not remove):
#   - Never drops, truncates, resets, or seeds production data
#   - Never runs prisma migrate reset or prisma db push --force
#   - Never stops the old Java app automatically
#   - Prisma migrate deploy is DISABLED by default (see note below)
#   - Always creates a MySQL backup before any changes
set -euo pipefail

APP_DIR=/opt/giftbox-oms
DB_NAME=buddiescraft_db
DB_USER=buddiescraft_user
DB_PASS='Giftbox@2026'
DB_HOST=127.0.0.1
DB_PORT=3306
# @ in password must be percent-encoded in the connection URL
DATABASE_URL="mysql://buddiescraft_user:Giftbox%402026@${DB_HOST}:${DB_PORT}/${DB_NAME}?allowPublicKeyRetrieval=true&ssl=false"
BACKUP_FILE="/root/buddiescraft_db_backup_$(date +%F_%H%M%S).sql"

# ── Step 1: Backup ────────────────────────────────────────────────────────────
echo "==> [1/7] Backing up database to $BACKUP_FILE ..."
mysqldump --no-tablespaces -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_FILE"
echo "    Backup saved: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"

# ── Step 2: Pull latest code ──────────────────────────────────────────────────
echo "==> [2/7] Pulling latest code ..."
cd "$APP_DIR"
git pull

# ── Step 3: Write .env (safe — preserves existing secrets) ───────────────────
echo "==> [3/7] Updating .env ..."

# Generate NEXTAUTH_SECRET only if missing
if [ -f .env ] && grep -q "^NEXTAUTH_SECRET=" .env && [ -n "$(grep '^NEXTAUTH_SECRET=' .env | cut -d= -f2-)" ]; then
  NEXTAUTH_SECRET_VALUE=$(grep '^NEXTAUTH_SECRET=' .env | cut -d= -f2-)
  echo "    NEXTAUTH_SECRET already present — keeping existing value."
else
  NEXTAUTH_SECRET_VALUE=$(openssl rand -base64 32)
  echo "    Generated new NEXTAUTH_SECRET."
fi

# Preserve RESEND_API_KEY if already present
if [ -f .env ] && grep -q "^RESEND_API_KEY=" .env && [ -n "$(grep '^RESEND_API_KEY=' .env | cut -d= -f2-)" ]; then
  RESEND_API_KEY_VALUE=$(grep '^RESEND_API_KEY=' .env | cut -d= -f2-)
  echo "    RESEND_API_KEY already present — keeping existing value."
else
  RESEND_API_KEY_VALUE="re_REPLACE_ME"
  echo "    WARNING: RESEND_API_KEY not set. Update .env manually with the real key."
fi

cat > .env << EOF
DATABASE_URL="${DATABASE_URL}"
NEXTAUTH_SECRET=${NEXTAUTH_SECRET_VALUE}
NEXTAUTH_URL=https://buddiescraft.duckdns.org
RESEND_API_KEY=${RESEND_API_KEY_VALUE}
RESEND_FROM_EMAIL=Buddies <hello.buddieslk@gmail.com>
EOF

# ── Step 4: Install dependencies ─────────────────────────────────────────────
echo "==> [4/7] Installing dependencies ..."
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

# ── Step 5: Generate Prisma client + build Next.js ───────────────────────────
echo "==> [5/7] Generating Prisma client and building ..."
npx prisma generate
npm run build

# ── Step 6: Prisma migration status (visibility only) ────────────────────────
echo "==> [6/7] Checking Prisma migration status ..."
npx prisma migrate status || true
# NOTE: prisma migrate deploy is intentionally NOT run automatically.
# This production database was originally created by the old Spring Boot app
# and later manually aligned with the Prisma schema. Future migrations must
# be reviewed and baselined before applying. To apply migrations manually:
#   RUN_PRISMA_MIGRATE=true bash deploy.sh
if [ "${RUN_PRISMA_MIGRATE:-false}" = "true" ]; then
  echo "    RUN_PRISMA_MIGRATE=true detected — running prisma migrate deploy ..."
  npx prisma migrate deploy
else
  echo "    Skipping prisma migrate deploy (set RUN_PRISMA_MIGRATE=true to enable)."
fi

# ── Step 7: Restart app + reload Nginx ───────────────────────────────────────
echo "==> [7/7] Restarting app and reloading Nginx ..."
if pm2 list | grep -q "giftbox-oms"; then
  pm2 restart giftbox-oms --update-env
else
  pm2 start ecosystem.config.js
fi
pm2 save

nginx -t
systemctl reload nginx

echo ""
echo "Deployment complete! App running on https://buddiescraft.duckdns.org"
echo "Tail logs: pm2 logs giftbox-oms"
