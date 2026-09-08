import { Hono } from "hono";
import { eq, desc, asc, and, gte, sql } from "drizzle-orm";
import {
  getSettings,
  setSetting,
  getUptimeStats,
  getUptimeBars,
  getOverallStatus,
} from "../db/queries";
import { requireAdmin } from "../auth/middleware";
import {
  monitors,
  components,
  componentGroups,
  incidents,
  incidentUpdates,
  maintenances,
  maintenanceComponents,
  subscribers,
  notificationChannels,
} from "../db/schema";

type Bindings = {
  pingflare_db: D1Database;
  SCHEDULER: DurableObjectNamespace;
  ADMIN_PASSWORD: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
  EMAIL_FROM?: string;
  EMAIL_PROVIDER?: string;
  SENDGRID_API_KEY?: string;
  MAILCHANNELS_DOMAIN?: string;
  AWS_SES_REGION?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
};

type Variables = { db: Db };
type Db = import("../db").Db;

const api = new Hono<{ Bindings: Bindings; Variables: Variables }>();

api.use("*", requireAdmin);

// ---- Settings ----
api.get("/settings", async (c) => {
  const settings = await getSettings(c.get("db"));
  return c.json(settings);
});

api.put("/settings", async (c) => {
  const body = await c.req.json<Record<string, string>>();
  for (const [key, value] of Object.entries(body)) {
    await setSetting(c.get("db"), key, value);
  }
  return c.json({ success: true });
});

// ---- Dashboard ----
api.get("/dashboard", async (c) => {
  const db = c.get("db");
  const [m, comps, groups, activeIncidents, upcomingMaintenance, overallStatus] = await Promise.all([
    db.select().from(monitors).orderBy(desc(monitors.createdAt)),
    db.select().from(components).orderBy(asc(components.sortOrder)),
    db.select().from(componentGroups).orderBy(asc(componentGroups.sortOrder)),
    db
      .select()
      .from(incidents)
      .where(sql`${incidents.status} IN ('investigating', 'identified', 'monitoring')`)
      .orderBy(desc(incidents.createdAt)),
    db
      .select()
      .from(maintenances)
      .where(and(eq(maintenances.status, "scheduled"), gte(maintenances.scheduledEnd, new Date())))
      .orderBy(asc(maintenances.scheduledStart)),
    getOverallStatus(db),
  ]);

  return c.json({
    monitors: m,
    components: comps,
    groups,
    recentIncidents: activeIncidents,
    upcomingMaintenance,
    overallStatus,
  });
});

// ---- Monitors ----
api.get("/monitors", async (c) => {
  const rows = await c.get("db").select().from(monitors).orderBy(desc(monitors.createdAt));
  return c.json(rows);
});

api.post("/monitors", async (c) => {
  const body = await c.req.json<{
    name: string;
    type: string;
    url: string;
    method?: string;
    expected_codes?: string;
    keyword?: string;
    keyword_forbidden?: boolean;
    headers?: string;
    timeout?: number;
    interval?: number;
    grace_period?: number;
    degraded_threshold?: number;
    component_id?: string;
  }>();

  const id = crypto.randomUUID();
  const now = new Date();
  await c.get("db").insert(monitors).values({
    id,
    name: body.name,
    type: body.type,
    url: body.url,
    method: body.method || "GET",
    expectedCodes: body.expected_codes || "200",
    keyword: body.keyword || null,
    keywordForbidden: !!body.keyword_forbidden,
    headers: body.headers || null,
    timeout: body.timeout || 30,
    interval: body.interval || 60,
    gracePeriod: body.grace_period || 3,
    degradedThreshold: body.degraded_threshold || 5000,
    componentId: body.component_id || null,
    createdAt: now,
    updatedAt: now,
  });

  return c.json({ id, success: true });
});

api.put("/monitors/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<Record<string, unknown>>();

  const set: Record<string, unknown> = {};
  const map: Record<string, string> = {
    name: "name",
    type: "type",
    url: "url",
    method: "method",
    expected_codes: "expectedCodes",
    keyword: "keyword",
    keyword_forbidden: "keywordForbidden",
    headers: "headers",
    timeout: "timeout",
    interval: "interval",
    grace_period: "gracePeriod",
    degraded_threshold: "degradedThreshold",
    enabled: "enabled",
    component_id: "componentId",
  };
  for (const [key, value] of Object.entries(body)) {
    if (map[key] !== undefined) set[map[key]] = value;
  }
  set.updatedAt = new Date();

  await c.get("db").update(monitors).set(set).where(eq(monitors.id, id));

  return c.json({ success: true });
});

api.delete("/monitors/:id", async (c) => {
  const id = c.req.param("id");
  await c.get("db").delete(monitors).where(eq(monitors.id, id));
  return c.json({ success: true });
});

// ---- Components ----
api.get("/components", async (c) => {
  const db = c.get("db");
  const comps = await db
    .select({
      id: components.id,
      groupId: components.groupId,
      name: components.name,
      description: components.description,
      status: components.status,
      showUptime: components.showUptime,
      sortOrder: components.sortOrder,
      startDate: components.startDate,
      createdAt: components.createdAt,
      updatedAt: components.updatedAt,
      groupName: componentGroups.name,
    })
    .from(components)
    .leftJoin(componentGroups, eq(components.groupId, componentGroups.id))
    .orderBy(asc(components.sortOrder));
  return c.json(comps);
});

api.post("/components", async (c) => {
  const body = await c.req.json<{
    name: string;
    group_id?: string;
    description?: string;
    show_uptime?: boolean;
    sort_order?: number;
  }>();

  const id = crypto.randomUUID();
  const now = new Date();
  await c.get("db").insert(components).values({
    id,
    name: body.name,
    groupId: body.group_id || null,
    description: body.description || null,
    showUptime: body.show_uptime !== false,
    sortOrder: body.sort_order || 0,
    createdAt: now,
    updatedAt: now,
  });

  return c.json({ id, success: true });
});

api.put("/components/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<Record<string, unknown>>();

  const set: Record<string, unknown> = {};
  const map: Record<string, string> = {
    name: "name",
    group_id: "groupId",
    description: "description",
    status: "status",
    show_uptime: "showUptime",
    sort_order: "sortOrder",
  };
  for (const [key, value] of Object.entries(body)) {
    if (map[key] !== undefined) set[map[key]] = value;
  }
  set.updatedAt = new Date();

  await c.get("db").update(components).set(set).where(eq(components.id, id));
  return c.json({ success: true });
});

api.delete("/components/:id", async (c) => {
  const id = c.req.param("id");
  await c.get("db").delete(components).where(eq(components.id, id));
  return c.json({ success: true });
});

// ---- Component Groups ----
api.get("/groups", async (c) => {
  const rows = await c.get("db").select().from(componentGroups).orderBy(asc(componentGroups.sortOrder));
  return c.json(rows);
});

api.post("/groups", async (c) => {
  const body = await c.req.json<{ name: string; description?: string; sort_order?: number }>();
  const id = crypto.randomUUID();
  const now = new Date();
  await c.get("db").insert(componentGroups).values({
    id,
    name: body.name,
    description: body.description || null,
    sortOrder: body.sort_order || 0,
    createdAt: now,
    updatedAt: now,
  });
  return c.json({ id, success: true });
});

api.put("/groups/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<Record<string, unknown>>();
  const set: Record<string, unknown> = {};
  const map: Record<string, string> = {
    name: "name",
    description: "description",
    sort_order: "sortOrder",
    collapsed: "collapsed",
  };
  for (const [key, value] of Object.entries(body)) {
    if (map[key] !== undefined) set[map[key]] = value;
  }
  set.updatedAt = new Date();
  await c.get("db").update(componentGroups).set(set).where(eq(componentGroups.id, id));
  return c.json({ success: true });
});

api.delete("/groups/:id", async (c) => {
  const id = c.req.param("id");
  await c.get("db").delete(componentGroups).where(eq(componentGroups.id, id));
  return c.json({ success: true });
});

// ---- Incidents ----
api.get("/incidents", async (c) => {
  const rows = await c.get("db").select().from(incidents).orderBy(desc(incidents.createdAt));
  return c.json(
    rows.map((r) => ({
      ...r,
      component_ids: (r.componentsAffected ? JSON.parse(r.componentsAffected) : []) as string[],
    }))
  );
});

api.post("/incidents", async (c) => {
  const body = await c.req.json<{
    title: string;
    status?: string;
    severity?: string;
    monitor_id?: string;
    component_ids?: string[];
    message?: string;
  }>();

  const id = crypto.randomUUID();
  const now = new Date();
  const db = c.get("db");

  await db.transaction(async (tx) => {
    await tx.insert(incidents).values({
      id,
      monitorId: body.monitor_id || null,
      title: body.title,
      message: body.message || null,
      status: body.status || "investigating",
      severity: body.severity || "minor",
      componentsAffected: JSON.stringify(body.component_ids || []),
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(incidentUpdates).values({
      id: crypto.randomUUID(),
      incidentId: id,
      status: body.status || "investigating",
      message: body.message || `Incident created: ${body.title}`,
      createdAt: now,
    });
  });

  return c.json({ id, success: true });
});

api.put("/incidents/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{
    status?: string;
    severity?: string;
    message?: string;
    component_ids?: string[];
  }>();
  const db = c.get("db");
  const now = new Date();

  await db.transaction(async (tx) => {
    const set: Record<string, unknown> = { updatedAt: now };
    if (body.status) {
      set.status = body.status;
      if (body.status === "resolved") set.resolvedAt = now;
    }
    if (body.severity) set.severity = body.severity;
    if (body.component_ids) set.componentsAffected = JSON.stringify(body.component_ids);

    await tx.update(incidents).set(set).where(eq(incidents.id, id));

    if (body.status && body.message) {
      await tx.insert(incidentUpdates).values({
        id: crypto.randomUUID(),
        incidentId: id,
        status: body.status,
        message: body.message,
        createdAt: now,
      });
    }
  });

  return c.json({ success: true });
});

api.delete("/incidents/:id", async (c) => {
  const id = c.req.param("id");
  await c.get("db").delete(incidents).where(eq(incidents.id, id));
  return c.json({ success: true });
});

// ---- Maintenances ----
api.get("/maintenances", async (c) => {
  const db = c.get("db");
  const rows = await db.select().from(maintenances).orderBy(desc(maintenances.scheduledStart));
  const linked = await db.select().from(maintenanceComponents);
  const byId = new Map<string, string[]>();
  for (const l of linked) {
    const arr = byId.get(l.maintenanceId) || [];
    arr.push(l.componentId);
    byId.set(l.maintenanceId, arr);
  }
  return c.json(rows.map((r) => ({ ...r, component_ids: byId.get(r.id) || [] })));
});

api.post("/maintenances", async (c) => {
  const body = await c.req.json<{
    title: string;
    description?: string;
    scheduled_start: number;
    scheduled_end: number;
    component_ids?: string[];
  }>();

  const id = crypto.randomUUID();
  const now = new Date();
  const db = c.get("db");

  await db.transaction(async (tx) => {
    await tx.insert(maintenances).values({
      id,
      title: body.title,
      message: body.description || null,
      scheduledStart: new Date(body.scheduled_start),
      scheduledEnd: new Date(body.scheduled_end),
      createdAt: now,
      updatedAt: now,
    });
    for (const componentId of body.component_ids || []) {
      await tx.insert(maintenanceComponents).values({ maintenanceId: id, componentId });
    }
  });

  return c.json({ id, success: true });
});

api.put("/maintenances/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<Record<string, unknown>>();
  const set: Record<string, unknown> = {};
  const map: Record<string, string> = {
    title: "title",
    description: "message",
    status: "status",
    scheduled_start: "scheduledStart",
    scheduled_end: "scheduledEnd",
    actual_start: "startedAt",
    actual_end: "completedAt",
  };
  for (const [key, value] of Object.entries(body)) {
    if (map[key] !== undefined) {
      set[map[key]] =
        value instanceof Number || (map[key] !== "title" && map[key] !== "message" && map[key] !== "status")
          ? new Date(Number(value))
          : value;
    }
  }
  set.updatedAt = new Date();
  await c.get("db").update(maintenances).set(set).where(eq(maintenances.id, id));
  return c.json({ success: true });
});

api.delete("/maintenances/:id", async (c) => {
  const id = c.req.param("id");
  await c.get("db").delete(maintenances).where(eq(maintenances.id, id));
  return c.json({ success: true });
});

// ---- Subscribers ----
api.get("/subscribers", async (c) => {
  const rows = await c.get("db").select().from(subscribers).orderBy(desc(subscribers.createdAt));
  return c.json(rows);
});

api.post("/subscribers", async (c) => {
  const body = await c.req.json<{ email: string }>();
  const id = crypto.randomUUID();
  const verifyToken = crypto.randomUUID();
  await c.get("db")
    .insert(subscribers)
    .values({ id, email: body.email, verifyToken, createdAt: new Date() })
    .onConflictDoNothing();
  return c.json({ success: true, verify_token: verifyToken });
});

api.delete("/subscribers/:id", async (c) => {
  const id = c.req.param("id");
  await c.get("db").delete(subscribers).where(eq(subscribers.id, id));
  return c.json({ success: true });
});

// ---- Notifications ----
api.get("/notifications", async (c) => {
  const rows = await c.get("db").select().from(notificationChannels).orderBy(desc(notificationChannels.createdAt));
  return c.json(rows);
});

api.post("/notifications", async (c) => {
  const body = await c.req.json<{ name: string; type: string; url?: string; config?: string }>();
  const id = crypto.randomUUID();
  const now = new Date();
  await c.get("db").insert(notificationChannels).values({
    id,
    name: body.name,
    type: body.type,
    url: body.url || null,
    config: body.config || null,
    createdAt: now,
    updatedAt: now,
  });
  return c.json({ id, success: true });
});

api.delete("/notifications/:id", async (c) => {
  const id = c.req.param("id");
  await c.get("db").delete(notificationChannels).where(eq(notificationChannels.id, id));
  return c.json({ success: true });
});

api.post("/notifications/:id/test", async (c) => {
  const id = c.req.param("id");
  const channel = await c.get("db")
    .select()
    .from(notificationChannels)
    .where(eq(notificationChannels.id, id))
    .limit(1);

  if (!channel[0]) return c.json({ error: "Channel not found" }, 404);
  const ch = channel[0];

  const testPayload = {
    event: "test" as const,
    title: "PingFlare Test Notification",
    message: "This is a test notification from your PingFlare status page.",
    timestamp: Date.now(),
  };

  try {
    switch (ch.type) {
      case "webhook":
      case "slack":
      case "discord": {
        if (!ch.url) return c.json({ error: "No webhook URL configured" }, 400);
        const text = `[PingFlare] Test notification: ${testPayload.message}`;
        await fetch(ch.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            ch.type === "slack"
              ? { text }
              : ch.type === "discord"
                ? { content: text }
                : { text, message: testPayload.message }
          ),
        });
        break;
      }
      case "telegram": {
        const botToken = ch.config;
        const chatId = ch.url;
        if (!botToken || !chatId) return c.json({ error: "Missing Telegram config" }, 400);
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: `[PingFlare] Test: ${testPayload.message}` }),
        });
        break;
      }
      case "sendgrid": {
        const cfg = JSON.parse(ch.config || "{}");
        const apiKey = cfg.apiKey || c.env.SENDGRID_API_KEY;
        if (!apiKey) return c.json({ error: "Missing SendGrid API key" }, 400);
        const from = cfg.from || c.env.EMAIL_FROM || "status@pingflare.com";
        const to = cfg.to || [];
        if (to.length === 0) return c.json({ error: "No recipients configured" }, 400);
        await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: to.map((e: string) => ({ email: e })) }],
            from: { email: from },
            subject: "[PingFlare] Test notification",
            content: [{ type: "text/plain", value: testPayload.message }],
          }),
        });
        break;
      }
      case "ses": {
        const cfg = JSON.parse(ch.config || "{}");
        const region = cfg.region || c.env.AWS_SES_REGION;
        const accessKeyId = cfg.accessKeyId || c.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = cfg.secretAccessKey || c.env.AWS_SECRET_ACCESS_KEY;
        const from = cfg.from || c.env.EMAIL_FROM || "status@pingflare.com";
        const to = cfg.to || [];
        if (!region || !accessKeyId || !secretAccessKey || to.length === 0) {
          return c.json({ error: "Missing SES config" }, 400);
        }
        const messageId = crypto.randomUUID();
        await fetch(`https://email.${region}.amazonaws.com/v2/email/outbound-emails`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            FromEmailAddress: from,
            Destination: { ToAddresses: to },
            Content: {
              Simple: {
                Subject: { Data: "[PingFlare] Test notification" },
                Body: { Text: { Data: testPayload.message } },
              },
            },
            ConfigurationSetName: undefined,
            FeedbackForwardingEmailAddress: undefined,
          }),
        });
        break;
      }
      case "mailchannels": {
        const cfg = JSON.parse(ch.config || "{}");
        const from = cfg.from || c.env.EMAIL_FROM || "status@pingflare.com";
        const to = cfg.to || [];
        if (to.length === 0) return c.json({ error: "No recipients configured" }, 400);
        await fetch("https://api.mailchannels.net/tx/v1/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: to.map((e: string) => ({ email: e })) }],
            from: { email: from },
            subject: "[PingFlare] Test notification",
            content: [{ type: "text/plain", value: testPayload.message }],
          }),
        });
        break;
      }
      case "twilio": {
        const cfg = JSON.parse(ch.config || "{}");
        const accountSid = cfg.accountSid || c.env.TWILIO_ACCOUNT_SID;
        const authToken = cfg.authToken || c.env.TWILIO_AUTH_TOKEN;
        const from = cfg.from || c.env.TWILIO_FROM_NUMBER;
        const to = cfg.to || [];
        if (!accountSid || !authToken || !from || to.length === 0) {
          return c.json({ error: "Missing Twilio config" }, 400);
        }
        const formData = new URLSearchParams();
        formData.append("To", to[0]);
        formData.append("From", from);
        formData.append("Body", `[PingFlare] Test: ${testPayload.message}`);
        const basicAuth = btoa(`${accountSid}:${authToken}`);
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: "POST",
          headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });
        break;
      }
      default:
        return c.json({ error: `Unsupported channel type: ${ch.type}` }, 400);
    }

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: "Test failed. Check your configuration." }, 500);
  }
});

api.get("/uptime/:monitorId", async (c) => {
  const monitorId = c.req.param("monitorId");
  const days = parseInt(c.req.query("days") || "90");
  const db = c.get("db");
  const stats = await getUptimeStats(db, monitorId, days);
  const bars = await getUptimeBars(db, monitorId, days);
  return c.json({ stats, bars });
});

export { api as apiRoutes };
