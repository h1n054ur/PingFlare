import { Hono } from "hono";
import { eq, desc, asc, inArray } from "drizzle-orm";
import { getOverallStatus } from "../db/queries";
import {
  components,
  componentGroups,
  incidents,
  incidentUpdates,
  maintenances,
  maintenanceComponents,
  monitors,
  subscribers,
} from "../db/schema";

type Bindings = { pingflare_db: D1Database };
type Db = import("../db").Db;
type Variables = { db: Db };

const pub = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const toIso = (d: Date | null | undefined): string | null =>
  d ? d.toISOString() : null;

async function componentsWithGroups(db: Db) {
  return db
    .select({
      id: components.id,
      name: components.name,
      description: components.description,
      status: components.status,
      groupId: components.groupId,
      groupName: componentGroups.name,
      sortOrder: components.sortOrder,
      monitorId: monitors.id,
    })
    .from(components)
    .leftJoin(componentGroups, eq(components.groupId, componentGroups.id))
    .leftJoin(monitors, eq(monitors.componentId, components.id))
    .orderBy(asc(components.sortOrder));
}

async function incidentsWithComponents(db: Db, statuses?: string[], limit?: number) {
  const cond = statuses && statuses.length ? inArray(incidents.status, statuses) : undefined;
  const base = db.select().from(incidents).where(cond).orderBy(desc(incidents.createdAt));
  const rows = typeof limit === "number" ? await base.limit(limit) : await base.all();
  return rows.map((r) => ({
    ...r,
    component_ids: (r.componentsAffected ? JSON.parse(r.componentsAffected) : []) as string[],
  }));
}

async function maintenancesWithComponents(db: Db, statuses: string[], limit?: number) {
  const base = db
    .select()
    .from(maintenances)
    .where(inArray(maintenances.status, statuses))
    .orderBy(asc(maintenances.scheduledStart));
  const rows = typeof limit === "number" ? await base.limit(limit) : await base.all();
  const linked = await db.select().from(maintenanceComponents);
  const byId = new Map<string, string[]>();
  for (const l of linked) {
    const arr = byId.get(l.maintenanceId) || [];
    arr.push(l.componentId);
    byId.set(l.maintenanceId, arr);
  }
  return rows.map((r) => ({ ...r, component_ids: byId.get(r.id) || [] }));
}

pub.get("/status.json", async (c) => {
  const db = c.get("db");
  const [overallStatus, comps, unresolvedIncidents, upcomingMaintenance] = await Promise.all([
    getOverallStatus(db),
    componentsWithGroups(db),
    incidentsWithComponents(db, ["investigating", "identified", "monitoring"]),
    maintenancesWithComponents(db, ["scheduled"], undefined),
  ]);

  const upcoming = upcomingMaintenance.filter((m) => m.scheduledEnd.getTime() > Date.now());

  return c.json({
    page: {
      id: "pingflare",
      name: "PingFlare",
      url: "",
      updated_at: new Date().toISOString(),
    },
    status: overallStatus,
    components: comps.map((comp) => ({
      id: comp.id,
      name: comp.name,
      status: comp.status,
      group_id: comp.groupId,
      group_name: comp.groupName,
      monitor_id: comp.monitorId,
    })),
    incidents: unresolvedIncidents.map((inc) => ({
      id: inc.id,
      name: inc.title,
      status: inc.status,
      severity: inc.severity,
      impact: inc.severity,
      created_at: toIso(inc.createdAt),
      updated_at: toIso(inc.updatedAt),
      component_ids: inc.component_ids,
    })),
    scheduled_maintenances: upcoming.slice(0, 50).map((maint) => ({
      id: maint.id,
      name: maint.title,
      description: maint.message,
      status: maint.status,
      scheduled_at: toIso(maint.scheduledStart),
      scheduled_until: toIso(maint.scheduledEnd),
      component_ids: maint.component_ids,
    })),
  });
});

pub.get("/components.json", async (c) => {
  const comps = await componentsWithGroups(c.get("db"));
  return c.json({
    components: comps.map((comp) => ({
      id: comp.id,
      name: comp.name,
      description: comp.description,
      status: comp.status,
      group: comp.groupName ? { id: comp.groupId, name: comp.groupName } : null,
    })),
  });
});

pub.get("/incidents.json", async (c) => {
  const limit = parseInt(c.req.query("limit") || "50");
  const incidents_ = await incidentsWithComponents(c.get("db"), undefined, limit);
  return c.json({
    incidents: incidents_.map((inc) => ({
      id: inc.id,
      name: inc.title,
      status: inc.status,
      severity: inc.severity,
      impact: inc.severity,
      created_at: toIso(inc.createdAt),
      updated_at: toIso(inc.updatedAt),
      resolved_at: toIso(inc.resolvedAt),
      component_ids: inc.component_ids,
    })),
  });
});

pub.get("/incidents/unresolved.json", async (c) => {
  const incidents_ = await incidentsWithComponents(c.get("db"), ["investigating", "identified", "monitoring"]);
  return c.json({
    incidents: incidents_.map((inc) => ({
      id: inc.id,
      name: inc.title,
      status: inc.status,
      severity: inc.severity,
      impact: inc.severity,
      created_at: toIso(inc.createdAt),
      updated_at: toIso(inc.updatedAt),
      component_ids: inc.component_ids,
    })),
  });
});

pub.get("/scheduled-maintenances.json", async (c) => {
  const db = c.get("db");
  const upcoming = await maintenancesWithComponents(db, ["scheduled", "in_progress", "verifying"]);
  const past = await maintenancesWithComponents(db, ["completed"], 50);

  return c.json({
    scheduled_maintenances: upcoming.map((m) => ({
      id: m.id,
      name: m.title,
      description: m.message,
      status: m.status,
      scheduled_at: toIso(m.scheduledStart),
      scheduled_until: toIso(m.scheduledEnd),
      component_ids: m.component_ids,
    })),
    completed_maintenances: past.map((m) => ({
      id: m.id,
      name: m.title,
      description: m.message,
      status: m.status,
      scheduled_at: toIso(m.scheduledStart),
      scheduled_until: toIso(m.scheduledEnd),
      completed_at: toIso(m.completedAt) || toIso(m.scheduledEnd),
      component_ids: m.component_ids,
    })),
  });
});

pub.get("/incidents/:id.json", async (c) => {
  const id = c.req.param("id");
  if (!id) return c.json({ error: "Incident not found" }, 404);
  const db = c.get("db");
  const incident = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
  if (!incident[0]) return c.json({ error: "Incident not found" }, 404);
  const inc = incident[0];

  const updates = await db
    .select()
    .from(incidentUpdates)
    .where(eq(incidentUpdates.incidentId, id))
    .orderBy(desc(incidentUpdates.createdAt));

  return c.json({
    incident: {
      ...inc,
      created_at: toIso(inc.createdAt),
      updated_at: toIso(inc.updatedAt),
      resolved_at: toIso(inc.resolvedAt),
      component_ids: (inc.componentsAffected ? JSON.parse(inc.componentsAffected) : []) as string[],
      incident_updates: updates.map((u) => ({
        id: u.id,
        status: u.status,
        body: u.message,
        display_at: toIso(u.createdAt),
        created_at: toIso(u.createdAt),
      })),
    },
  });
});

pub.get("/subscribe.json", async (c) => {
  const comps = await c.get("db")
    .select({ id: components.id, name: components.name })
    .from(components)
    .orderBy(asc(components.sortOrder));
  return c.json({ components: comps });
});

pub.post("/subscribe.json", async (c) => {
  const body = await c.req.json<{ email: string; component_ids?: string[] }>();

  if (!body.email || !body.email.includes("@")) {
    return c.json({ error: "Valid email required" }, 400);
  }

  const id = crypto.randomUUID();
  const verifyToken = crypto.randomUUID();

  await c.get("db")
    .insert(subscribers)
    .values({ id, email: body.email, verifyToken, createdAt: new Date() })
    .onConflictDoNothing();

  return c.json({
    success: true,
    message: "Subscription created. Check your email to verify.",
  });
});

export { pub as publicApiRoutes };
