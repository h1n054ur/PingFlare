# PingFlare

A feature-complete, self-hosted alternative to Atlassian Statuspage — running as **one single Cloudflare Worker**.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/h1n054ur/PingFlare)

**Stack:** Hono (API) + React 19 + Mantine 9 (Vite SPA) + D1 (Drizzle ORM) + Durable Object scheduler + Better Auth. One deploy = status page, monitoring engine, admin dashboard, and public API.

## Features

- **Public status page** — overall status (worst component), component groups, per-component uptime % (current/7d/30d/90d/365d) + latency graphs, incidents list, scheduled maintenance (upcoming/past), i18n (EN/ES).
- **Incidents** — lifecycle Investigating → Identified → Monitoring → Resolved with timestamped updates, affected components, severity; auto-created after N failed checks; auto-resolved on recovery.
- **Monitoring** — HTTP(S) + TCP checks, expected status codes, keyword / forbidden-keyword matching, per-monitor timeout, grace periods. A Durable Object alarm runs all checks every 60s — no Cron Triggers needed.
- **Notifications** — webhooks (generic + Slack/Discord/Telegram), email (SendGrid / Mailchannels / AWS SES), SMS (Twilio) on incident create/update/resolve/maintenance; channels configured in the dashboard with a built-in test-send.
- **Auth** — Better Auth (email/password) with sessions stored in D1.
- **Public API** (Statuspage-compatible): `/api/v2/status.json`, `/api/v2/components.json`, `/api/v2/incidents.json`, `/api/v2/incidents/unresolved.json`, `/api/v2/scheduled-maintenances.json`; authenticated admin CRUD under `/api/admin/*`.

## One-click deploy

Click the **Deploy to Cloudflare** button above. Cloudflare clones this repo into your GitHub account, provisions a D1 database and the Durable Object, builds the SPA, applies migrations, and deploys — no manual setup.

The `deploy` script runs `wrangler d1 migrations apply pingflare_db --remote` (the D1 binding) before `wrangler deploy`, so the database schema is always up to date.

### Post-deploy setup (required)

The worker is secure by default — the admin account can't be created until you set an admin password. After deploying:

```bash
bunx wrangler secret put ADMIN_PASSWORD      # bootstrap password for /api/setup
bunx wrangler secret put BETTER_AUTH_SECRET  # long random string (session signing)
```

Then create the first admin user:

```bash
curl -X POST https://<your-worker>.workers.dev/api/setup \
  -H "Content-Type: application/json" \
  -d '{"setupKey":"<ADMIN_PASSWORD>","email":"you@example.com","password":"a-strong-password"}'
```

Sign in at `https://<your-worker>.workers.dev/admin`.

## Local development

```bash
bun install                # or npm install
cp .env.example .dev.vars  # fill in local secrets
bun run db:migrate         # apply D1 migrations locally
bun run dev                # builds SPA, then wrangler dev on :8787
```

## Database migrations

Schema is defined in `src/db/schema.ts` (Drizzle). Migrations are generated into `drizzle/` and applied by Wrangler's D1 migrations runner (no runtime migration code):

```bash
bun run db:generate         # drizzle-kit generate (after editing schema.ts)
bun run db:migrate          # apply locally
bun run db:migrate:remote   # apply to production
```

> [!NOTE]
> `wrangler.jsonc` intentionally omits `database_id` — the one-click deploy auto-provisions D1 and injects the ID for you.
> Deploying via the CLI instead? Create the database first and paste the printed `database_id` into `wrangler.jsonc`:
>
> ```bash
> wrangler d1 create pingflare-db
> bun run deploy
> ```

## Secrets (optional integrations)

Set via `bunx wrangler secret put <KEY>` or in `.dev.vars` locally. See `.env.example` for the full list.

| Key | Purpose |
|-----|---------|
| `ADMIN_PASSWORD` | Bootstrap password for `/api/setup` (required) |
| `BETTER_AUTH_SECRET` | Better Auth signing secret (required) |
| `BETTER_AUTH_URL` | Overrides the worker URL (defaults to request origin) |
| `EMAIL_PROVIDER` | `sendgrid` \| `mailchannels` \| `ses` |
| `SENDGRID_API_KEY` | SendGrid key (if provider = sendgrid) |
| `MAILCHANNELS_DOMAIN` | Verified domain (if provider = mailchannels) |
| `AWS_SES_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | SES (if provider = ses) |
| `EMAIL_FROM` / `NOTIFY_ADMIN_EMAIL` | Outbound email settings |
| `SMS_PROVIDER` | `twilio` |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` / `TWILIO_TO_NUMBERS` | Twilio SMS |
| `SLACK_WEBHOOK_URL` / `DISCORD_WEBHOOK_URL` / `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Fallback channels |

## Layout

```
src/worker.ts      Hono app: /api/* + /api/auth/* + SPA serving + DO arming (waitUntil)
src/scheduler.ts   SchedulerDO — alarm every 60s → checks → D1 → notifications
src/auth/          Better Auth config + session middleware + admin bootstrap
src/notify/        Webhooks + email (SendGrid/Mailchannels/SES) + SMS (Twilio)
src/db/            schema.ts (Drizzle) + queries.ts
src/routes/        api.ts (admin CRUD) + public-api.ts (Statuspage-style API v2)
drizzle/           Generated SQL migrations (applied by wrangler)
web/               Vite + React 19 + Mantine 9 + i18next + chart.js
wrangler.jsonc     Single deploy: SPA + API + DO + D1
```

## Cloudflare gotchas baked in

- **DO alarm** (not Cron) is the 60s scheduler; re-armed in `finally` so a failed run never kills the loop.
- **`ctx.waitUntil(stub.fetch())`** arms the scheduler — fire-and-forget is cancelled in prod.
- DO migrations use `new_sqlite_classes` with a `tag` (never edit an applied tag).
- `nodejs_compat` + `assets: { binding: "ASSETS" }` serve the SPA from the same worker — no CORS, one origin.

## License

MIT
