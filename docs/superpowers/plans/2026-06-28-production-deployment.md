# Production Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the running Java Spring Boot OMS with the new Next.js 16 app on `buddiescraft.duckdns.org` without any data loss.

**Architecture:** Next.js app runs as a PM2 process on the same VPS, reading from the existing plain MySQL install. Nginx reverse-proxies HTTPS → 127.0.0.1:3000. Prisma migrations are opt-in (not auto-applied) because this DB was originally created by the old Spring Boot app.

**Tech Stack:** Node.js 20, PM2, Next.js 16, Prisma 7, MySQL (plain install, port 3306), Nginx

## Global Constraints

- DB name: `buddiescraft_db`, user: `buddiescraft_user`, password: `Giftbox@2026`
- DATABASE_URL password uses percent-encoded `@` → `%40`
- DB host: `127.0.0.1:3306`
- App port: `3000` (PM2 → Nginx proxies to this)
- App dir on server: `/opt/giftbox-oms`
- Old Java app dir: `/opt/giftbox` (do NOT touch unless asked)
- Server domain: `https://buddiescraft.duckdns.org`
- Node.js minimum version: 20
- **Never** run `prisma migrate reset`, `prisma db push --force`, or any destructive DB command
- **Never** stop the old Java app automatically

---

## Pre-flight: Server Checks (run BEFORE deploy)

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

- [ ] **Check MySQL**

```bash
mysql -h 127.0.0.1 -u buddiescraft_user -p'Giftbox@2026' -e "SELECT 1;" buddiescraft_db
```
Expected: `+---+\n| 1 |\n+---+\n| 1 |`

- [ ] **Check repo dir exists or create it**

```bash
ls /opt/giftbox-oms || git clone https://github.com/mktharindu/giftbox-oms.git /opt/giftbox-oms
```

---

## Task 1: Push deployment files from local machine

**Files:**
- Modified: `next.config.ts`
- Modified: `deploy.sh` — full deployment script with real production values
- Modified: `.env.production.example` — template with real DB name
- Created: `ecosystem.config.js` — PM2 app definition

- [ ] **Step 1: Commit and push**

```bash
git add next.config.ts ecosystem.config.js deploy.sh .env.production.example
git commit -m "feat: add PM2 deploy script for production VPS"
git push origin main
```

---

## Task 2: Create .env on the server (first-time only)

- [ ] **Step 1: SSH into server, create .env**

```bash
cat > /opt/giftbox-oms/.env << 'EOF'
DATABASE_URL="mysql://buddiescraft_user:Giftbox%402026@127.0.0.1:3306/buddiescraft_db?allowPublicKeyRetrieval=true&ssl=false"
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=https://buddiescraft.duckdns.org
RESEND_API_KEY=re_M8x18AyM_KewjcPV5sWZFzhx5c3jLrisF
RESEND_FROM_EMAIL=Buddies <hello.buddieslk@gmail.com>
EOF
```

> `deploy.sh` preserves NEXTAUTH_SECRET and RESEND_API_KEY on subsequent runs — never overwrites existing values.

---

## Task 3: Run deploy.sh

- [ ] **Step 1: Run on the server**

```bash
cd /opt/giftbox-oms
bash deploy.sh
```

What it does:
1. `mysqldump --no-tablespaces` → `/root/buddiescraft_db_backup_DATE.sql`
2. `git pull`
3. Updates `.env` safely (preserves existing secrets)
4. `npm ci` (or `npm install` if no lockfile)
5. `npx prisma generate` + `npm run build`
6. `npx prisma migrate status` (visibility only — does NOT apply migrations)
7. `pm2 restart giftbox-oms --update-env` (or `pm2 start` if first run)
8. `pm2 save` + `nginx -t` + `systemctl reload nginx`

- [ ] **Step 2: Verify app**

```bash
pm2 list
# Expected: giftbox-oms  online
curl http://localhost:3000
# Expected: HTML response
pm2 logs giftbox-oms --lines 30
# Expected: "Ready - started server on 0.0.0.0:3000", no DB errors
```

---

## Task 4: Configure Nginx

- [ ] **Step 1: Edit Nginx config**

```bash
sudo nano /etc/nginx/sites-available/buddiescraft
```

```nginx
server {
    listen 80;
    server_name buddiescraft.duckdns.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name buddiescraft.duckdns.org;

    # SSL certs (Let's Encrypt or existing)
    ssl_certificate     /etc/letsencrypt/live/buddiescraft.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/buddiescraft.duckdns.org/privkey.pem;

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

    # Serve uploaded files from old Java app directly
    location /uploads/ {
        alias /opt/giftbox/uploads/;
    }
}
```

- [ ] **Step 2: Test and reload**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

- [ ] **Step 3: Browser test**

Open `https://buddiescraft.duckdns.org/login` — new Next.js login page should appear.

---

## Task 5: PM2 startup on reboot

- [ ] **Step 1: Enable PM2 on boot**

```bash
pm2 startup
# Run the command it prints, then:
pm2 save
```

---

## Applying Prisma Migrations (manual, opt-in)

> This DB was originally created by the old Spring Boot app and later manually aligned with the Prisma schema. Do NOT apply migrations blindly.

When you add a new migration and are ready to apply it on production:

```bash
# Option A: first-time baseline (marks old migrations as already applied without running them)
npx prisma migrate resolve --applied "20260607061220_init"
npx prisma migrate resolve --applied "20260607073618_add_schema_improvements"
npx prisma migrate resolve --applied "20260622182845_add_must_change_password"

# Option B: apply new migrations only (after baselines are done)
RUN_PRISMA_MIGRATE=true bash deploy.sh
```

---

## Rollback

If the new app fails:

```bash
# 1. Stop new app
pm2 stop giftbox-oms

# 2. Restore DB (only if data was corrupted)
mysql -u buddiescraft_user -p'Giftbox@2026' buddiescraft_db < /root/buddiescraft_db_backup_DATE.sql

# 3. Old Java app is still in /opt/giftbox — restart it manually if needed
cd /opt/giftbox && bash start.sh

# 4. Revert Nginx proxy_pass to old Java app port (was 8080)
```
