#!/bin/bash
# deploy.sh — Run on the server to deploy the Next.js OMS.
# Prerequisites: Node 20+, npm, pm2, git, mysqldump
# Usage: bash deploy.sh
set -e

APP_DIR=/opt/giftbox-oms
OLD_APP_DIR=/opt/giftbox
BACKUP_FILE="$OLD_APP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql"
DB_NAME=giftbox_oms
DB_USER=giftbox
DB_PASS=giftbox
DB_HOST=127.0.0.1
DB_PORT=3306    # plain MySQL default; change to 3307 if your install uses that

# ─────────────────────────────────────────────────────────────
echo "==> [1/6] Backing up MySQL database to $BACKUP_FILE ..."
mysqldump -h $DB_HOST -P $DB_PORT -u $DB_USER -p"$DB_PASS" $DB_NAME > "$BACKUP_FILE"
echo "    Backup saved: $BACKUP_FILE ($(du -sh $BACKUP_FILE | cut -f1))"

# ─────────────────────────────────────────────────────────────
echo "==> [2/6] Stopping old Java app (if running) ..."
pkill -f giftbox-oms.jar 2>/dev/null && echo "    Java app stopped." || echo "    Java app was not running."

# ─────────────────────────────────────────────────────────────
echo "==> [3/6] Cloning / updating repo ..."
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull origin main
else
  git clone https://github.com/mktharindu/giftbox-oms.git "$APP_DIR"
fi

# Copy .env (must exist on server already)
if [ ! -f "$APP_DIR/.env" ]; then
  echo "ERROR: $APP_DIR/.env not found. Create it from .env.production.example first."
  exit 1
fi

# ─────────────────────────────────────────────────────────────
echo "==> [4/6] Installing dependencies and building ..."
cd "$APP_DIR"
npm ci
npx prisma generate
npm run build

# ─────────────────────────────────────────────────────────────
echo "==> [5/6] Running Prisma migrations ..."
# Baseline existing migrations so Prisma doesn't try to CREATE TABLE on existing data.
# Only needs to run ONCE on first deploy; safe to re-run (resolve is idempotent).
npx prisma migrate resolve --applied "20260607061220_init"             2>/dev/null || true
npx prisma migrate resolve --applied "20260607073618_add_schema_improvements"  2>/dev/null || true
npx prisma migrate resolve --applied "20260622182845_add_must_change_password" 2>/dev/null || true

# Apply any NEW migrations added after initial deploy
npx prisma migrate deploy

# ─────────────────────────────────────────────────────────────
echo "==> [6/6] (Re)starting app with PM2 ..."
if pm2 list | grep -q giftbox-oms; then
  pm2 reload giftbox-oms
else
  pm2 start ecosystem.config.js
  pm2 save
fi

echo ""
echo "Done! App is running on port 3000."
echo "Check logs: pm2 logs giftbox-oms"
echo "Tail errors: pm2 logs giftbox-oms --err"
