import { DurableObject } from "cloudflare:workers";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { dispatchNotification } from "./notify/notify";
import { createDb, type Db } from "./db";
import {
  monitors,
  checkHistory,
  incidents,
  incidentUpdates,
  statusChanges,
} from "./db/schema";

interface Env {
  pingflare_db: D1Database;
  SCHEDULER: DurableObjectNamespace<SchedulerDO>;
  ASSETS: Fetcher;
  ADMIN_PASSWORD: string;
  APP_NAME: string;
  NOTIFY_ADMIN_EMAIL?: string;
  EMAIL_PROVIDER?: string;
  EMAIL_FROM?: string;
  SENDGRID_API_KEY?: string;
  MAILCHANNELS_DOMAIN?: string;
  SES_REGION?: string;
  SES_ACCESS_KEY_ID?: string;
  SES_SECRET_ACCESS_KEY?: string;
  SMS_PROVIDER?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
  TWILIO_TO_NUMBERS?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

type SchedulerState = "running" | "idle";

export class SchedulerDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const existing = await this.ctx.storage.get<SchedulerState>("state");
      if (!existing) {
        await this.ctx.storage.put("state", "idle");
      }
    });
  }

  async fetch(_request: Request): Promise<Response> {
    await this.armAlarm();
    return new Response("Scheduler armed", { status: 200 });
  }

  async armAlarm(): Promise<void> {
    const currentAlarm = await this.ctx.storage.getAlarm();
    if (!currentAlarm) {
      await this.ctx.storage.setAlarm(Date.now() + 5_000);
    }
  }

  async alarm(): Promise<void> {
    try {
      await this.ctx.storage.put("state", "running");
      await runAllChecks(this.env);
    } catch (err) {
      console.error("Scheduler check error:", err);
    } finally {
      await this.ctx.storage.put("state", "idle");
      await this.ctx.storage.setAlarm(Date.now() + 60_000);
    }
  }
}

async function runAllChecks(env: Env): Promise<void> {
  const db = createDb(env.pingflare_db);
  const rows = await db
    .select()
    .from(monitors)
    .where(eq(monitors.enabled, true));

  for (const monitor of rows) {
    try {
      await checkMonitor(env, db, monitor);
    } catch (err) {
      console.error(`Check failed for monitor ${monitor.id}:`, err);
    }
  }
}

async function checkMonitor(env: Env, db: Db, monitor: typeof monitors.$inferSelect): Promise<void> {
  const startTime = Date.now();
  let status: "up" | "down" | "degraded" = "up";
  let responseTime = 0;
  let statusCode: number | null = null;
  let error: string | null = null;

  try {
    if (monitor.type === "http") {
      const result = await checkHttp(monitor);
      status = result.status;
      responseTime = result.responseTime;
      statusCode = result.statusCode;
      error = result.error;
    } else if (monitor.type === "tcp") {
      const result = await checkTcp(monitor);
      status = result.status;
      responseTime = result.responseTime;
      error = result.error;
    }
  } catch (err) {
    status = "down";
    error = err instanceof Error ? err.message : "Unknown error";
    responseTime = Date.now() - startTime;
  }

  const now = new Date();

  await db.insert(checkHistory).values({
    id: crypto.randomUUID(),
    monitorId: monitor.id,
    status,
    responseTime,
    statusCode,
    message: error,
    checkedAt: now,
  });

  await updateMonitorStatus(env, db, monitor, status, responseTime, now);
  await checkGracePeriod(env, db, monitor, status, now);
}

async function checkHttp(monitor: typeof monitors.$inferSelect): Promise<{
  status: "up" | "down" | "degraded";
  responseTime: number;
  statusCode: number | null;
  error: string | null;
}> {
  const timeout = (monitor.timeout || 30) * 1000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const url = monitor.url!;
    const headers: Record<string, string> = {};
    if (monitor.headers) {
      try {
        Object.assign(headers, JSON.parse(monitor.headers));
      } catch {}
    }

    const start = Date.now();
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    const responseTime = Date.now() - start;

    const expectedCodes = monitor.expectedCodes
      ? monitor.expectedCodes.split(",").map((c) => parseInt(c.trim()))
      : [200, 201, 202, 204];

    let status: "up" | "down" | "degraded" = "up";
    if (!expectedCodes.includes(res.status)) {
      status = "down";
    } else if (responseTime > (monitor.degradedThreshold || 5000)) {
      status = "degraded";
    }

    if (monitor.keyword) {
      const body = await res.text();
      if (monitor.keywordForbidden) {
        if (body.includes(monitor.keyword)) status = "down";
      } else if (!body.includes(monitor.keyword)) {
        status = "down";
      }
    }

    return { status, responseTime, statusCode: res.status, error: status !== "up" ? `Status ${res.status}` : null };
  } catch (err) {
    clearTimeout(timer);
    return { status: "down", responseTime: timeout, statusCode: null, error: err instanceof Error ? err.message : "Fetch failed" };
  }
}

async function checkTcp(monitor: typeof monitors.$inferSelect): Promise<{
  status: "up" | "down" | "degraded";
  responseTime: number;
  error: string | null;
}> {
  const [host, portStr] = (monitor.url || "").split(":");
  const port = parseInt(portStr || "80");
  const timeout = (monitor.timeout || 30) * 1000;
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const socket = new WebSocket(`wss://${host}:${port}`);
    await new Promise<void>((resolve, reject) => {
      socket.onopen = () => {
        clearTimeout(timer);
        socket.close();
        resolve();
      };
      socket.onerror = () => reject(new Error("TCP connection failed"));
      setTimeout(() => {
        socket.close();
        reject(new Error("TCP timeout"));
      }, timeout);
    });

    return { status: "up", responseTime: Date.now() - startTime, error: null };
  } catch (err) {
    return { status: "down", responseTime: Date.now() - startTime, error: err instanceof Error ? err.message : "TCP check failed" };
  }
}

async function updateMonitorStatus(
  env: Env,
  db: Db,
  monitor: typeof monitors.$inferSelect,
  status: "up" | "down" | "degraded",
  responseTime: number,
  now: Date
): Promise<void> {
  const previousStatus = monitor.status;
  await db
    .update(monitors)
    .set({ status, lastChecked: now, lastResponseTime: responseTime, updatedAt: now })
    .where(eq(monitors.id, monitor.id));

  if (previousStatus !== status && status === "up") {
    const incident = await db
      .select()
      .from(incidents)
      .where(
        and(
          eq(incidents.monitorId, monitor.id),
          sql`${incidents.status} IN ('investigating', 'identified', 'monitoring')`
        )
      )
      .limit(1);

    if (incident[0]) {
      await db.transaction(async (tx) => {
        await tx
          .update(incidents)
          .set({ status: "resolved", resolvedAt: now, updatedAt: now })
          .where(eq(incidents.id, incident[0].id));
        await tx.insert(incidentUpdates).values({
          id: crypto.randomUUID(),
          incidentId: incident[0].id,
          status: "resolved",
          message: `${monitor.name} has recovered. This incident is resolved.`,
          createdAt: now,
        });
      });

      await dispatchNotification(env as any, createDb(env.pingflare_db), {
        event: "incident.resolved",
        title: incident[0].title,
        message: `${monitor.name} has recovered and is back online.`,
        severity: "major",
        status: "resolved",
        incidentId: incident[0].id,
        monitorName: monitor.name,
        timestamp: now.getTime(),
      });
    }
  } else if (previousStatus !== status && status === "down") {
    await db.insert(statusChanges).values({
      id: crypto.randomUUID(),
      monitorId: monitor.id,
      oldStatus: previousStatus,
      newStatus: status,
      changedAt: now,
    });
  }
}

async function checkGracePeriod(
  env: Env,
  db: Db,
  monitor: typeof monitors.$inferSelect,
  currentStatus: "up" | "down" | "degraded",
  now: Date
): Promise<void> {
  if (currentStatus !== "down") return;

  const gracePeriod = monitor.gracePeriod || 3;
  const recentChecks = await db
    .select({ status: checkHistory.status })
    .from(checkHistory)
    .where(
      and(
        eq(checkHistory.monitorId, monitor.id),
        gte(checkHistory.checkedAt, new Date(Date.now() - gracePeriod * 120_000))
      )
    )
    .orderBy(desc(checkHistory.checkedAt))
    .limit(gracePeriod);

  const consecutiveDowns = recentChecks.filter((c) => c.status === "down").length;

  if (consecutiveDowns >= gracePeriod) {
    const existingIncident = await db
      .select({ id: incidents.id })
      .from(incidents)
      .where(
        and(
          eq(incidents.monitorId, monitor.id),
          sql`${incidents.status} IN ('investigating', 'identified', 'monitoring')`
        )
      )
      .limit(1);

    if (!existingIncident[0]) {
      const incidentId = crypto.randomUUID();
      await db.transaction(async (tx) => {
        await tx.insert(incidents).values({
          id: incidentId,
          monitorId: monitor.id,
          title: `${monitor.name} is down`,
          status: "investigating",
          severity: "major",
          createdAt: now,
          updatedAt: now,
        });
        await tx.insert(incidentUpdates).values({
          id: crypto.randomUUID(),
          incidentId,
          status: "investigating",
          message: `Automatically created: ${monitor.name} has been down for ${consecutiveDowns} consecutive checks.`,
          createdAt: now,
        });
      });

      await dispatchNotification(env as any, createDb(env.pingflare_db), {
        event: "incident.created",
        title: `${monitor.name} is down`,
        message: `${monitor.name} has been failing for ${consecutiveDowns} consecutive checks.`,
        severity: "major",
        status: "investigating",
        incidentId,
        monitorName: monitor.name,
        timestamp: now.getTime(),
      });
    }
  }
}
