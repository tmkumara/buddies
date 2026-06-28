# Production Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the running Java Spring Boot OMS with the new Next.js 16 app on `buddiescraft.duckdns.org` without any data loss.

**Architecture:** Next.js app runs as a PM2 process on the same server, reading from the existing plain MySQL install. Nginx reverse-proxies port 80/443 → 3000. Prisma migrations are baselined so existing tables are not re-created.

**Tech Stack:** Node.js 20, PM2, Next.js 16, Prisma 7, MySQL (plain install), Nginx

## Global Constraints

- MySQL credentials: user=`giftbox`, password=`giftbox`, db=`giftbox_oms`, host=`127.0.0.1`
- MySQL port: `3306` (plain install default) — change to `3307` in `deploy.sh` if your server uses a custom port
- App port: `3000` (PM2 → Nginx proxies to this)
- App dir on server: `/opt/giftbox-oms`
- Old Java app dir: `/opt/giftbox`
- Server domain: `buddiescraft.duckdns.org`
- Node.js minimum version: 20

---

## Pre-flight: Server Checks (run BEFORE deploy)

These confirm the server has everything deploy.sh needs.

- [ ] **Check Node.js version**

```bash
node -v   # must be v20+
```
If missing: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs`

- [ ] **Check PM2**

```bash
pm2 -v
```
If missing: `sudo npm install -g pm2`

- [ ] **Check MySQL is running**

```bash
mysql -h 127.0.0.1 -u giftbox -pgiftbox -e "SELECT 1;" giftbox_oms
```
Expected: `+---+\n| 1 |\n+---+\n| 1 |`

- [ ] **Check git**

```bash
git --version
```

- [ ] **Confirm DB port** — if the command above fails try `-P 3307`. Update `DB_PORT` in `deploy.sh` accordingly.

---

## Task 1: Push the new code to the server

**Files:**
- Modified: `next.config.ts` — removed standalone (plain PM2 deploy)
- Created: `ecosystem.config.js` — PM2 app definition
- Created: `deploy.sh` — full deployment script
- Created: `.env.production.example` — env var template

- [ ] **Step 1: Commit and push deployment files**

On your local machine:
```bash
git add next.config.ts ecosystem.config.js deploy.sh .env.production.example
git commit -m "feat: add PM2 + deploy script for production server"
git push origin main
```

- [ ] **Step 2: Create .env on the server**

SSH into the server, then:
```bash
mkdir -p /opt/giftbox-oms
cat > /opt/giftbox-oms/.env << 'EOF'
DATABASE_URL="mysql://giftbox:giftbox@127.0.0.1:3306/giftbox_oms?allowPublicKeyRetrieval=true&ssl=false"
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=https://buddiescraft.duckdns.org
RESEND_API_KEY=re_M8x18AyM_KewjcPV5sWZFzhx5c3jLrisF
RESEND_FROM_EMAIL=Buddies <hello.buddieslk@gmail.com>
EOF
```

> Generate NEXTAUTH_SECRET with: `openssl rand -base64 32`

---

## Task 2: Run the deploy script

- [ ] **Step 1: Download deploy.sh on the server**

```bash
# From /opt/giftbox-oms (or wherever you cloned the repo)
bash /opt/giftbox-oms/deploy.sh
```

The script does these steps in order:
1. Backs up MySQL → `/opt/giftbox/backup-YYYYMMDD-HHMMSS.sql`
2. Stops the Java app
3. Clones/pulls the repo into `/opt/giftbox-oms`
4. `npm ci` + `prisma generate` + `npm run build`
5. Baselines existing Prisma migrations (prevents CREATE TABLE errors on existing data)
6. Applies any new migrations
7. Starts app with PM2

- [ ] **Step 2: Verify app is running**

```bash
pm2 list
# Expected: giftbox-oms  online
curl http://localhost:3000
# Expected: HTML response
```

- [ ] **Step 3: Check logs for errors**

```bash
pm2 logs giftbox-oms --lines 50
# Expected: "Ready - started server on 0.0.0.0:3000"
# No database errors
```

---

## Task 3: Update Nginx to point to new app

- [ ] **Step 1: Edit Nginx config**

```bash
sudo nano /etc/nginx/sites-available/buddiescraft
```

Replace the `proxy_pass` (or add if not present) to point at the Next.js app:
```nginx
server {
    listen 80;
    server_name buddiescraft.duckdns.org;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve uploaded files directly (from old Java app uploads folder)
    location /uploads/ {
        alias /opt/giftbox/uploads/;
    }
}
```

- [ ] **Step 2: Test and reload Nginx**

```bash
sudo nginx -t
# Expected: syntax is ok / test is successful
sudo systemctl reload nginx
```

- [ ] **Step 3: Verify via browser**

Open `http://buddiescraft.duckdns.org/login` — should show the new Next.js login page.

---

## Task 4: Enable PM2 startup on reboot

- [ ] **Step 1: Save PM2 process list**

```bash
pm2 save
```

- [ ] **Step 2: Generate startup script**

```bash
pm2 startup
# Follow the instruction it prints (usually: sudo env PATH=... pm2 startup systemd ...)
```

- [ ] **Step 3: Reboot and verify**

```bash
sudo reboot
# Wait 30 seconds, then:
curl http://localhost:3000
pm2 list
```

---

## Rollback Plan (if something goes wrong)

If the new app fails and you need to restore the old Java app immediately:

```bash
# 1. Stop new app
pm2 stop giftbox-oms

# 2. Restore DB backup (only if data was corrupted — usually not needed)
mysql -u giftbox -pgiftbox giftbox_oms < /opt/giftbox/backup-YYYYMMDD-HHMMSS.sql

# 3. Restart old Java app
cd /opt/giftbox
bash start.sh

# 4. Revert Nginx to old port (whatever the Java app used)
sudo nano /etc/nginx/sites-available/buddiescraft
sudo systemctl reload nginx
```

---

## Notes on Prisma Migration Baseline

The new Next.js app uses Prisma migrations to manage the schema. The old Java Spring Boot app already created the same tables (users, customer, customer_order, etc.). On first deploy, `deploy.sh` runs:

```bash
npx prisma migrate resolve --applied "20260607061220_init"
```

This inserts a row into `_prisma_migrations` table marking those migrations as already applied — without actually running the `CREATE TABLE` SQL. This prevents the "Table already exists" error. Any future migrations (added after first deploy) will run normally via `prisma migrate deploy`.
