import { eq, and, gte, sql, count } from "drizzle-orm";
import { type Db } from "./index";
import { checkHistory, components, settings as settingsTable } from "./schema";

export type { Db };

export async function getSettings(db: Db): Promise<Record<string, string>> {
  const rows = await db.select().from(settingsTable);
  const out: Record<string, string> = {};
  for (const row of rows) out[row.key] = row.value;
  return out;
}

export async function getSetting(db: Db, key: string): Promise<string | null> {
  const rows = await db
    .select({ value: settingsTable.value })
    .from(settingsTable)
    .where(eq(settingsTable.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
}

export async function setSetting(db: Db, key: string, value: string): Promise<void> {
  await db
    .insert(settingsTable)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function initDefaultSettings(db: Db): Promise<void> {
  const defaults: Record<string, string> = {
    page_title: "System Status",
    page_description: "Current system status and uptime information",
    page_url: "",
    logo_url: "",
    favicon_url: "",
    custom_css: "",
    custom_html_head: "",
    custom_html_footer: "",
    password_protect: "0",
    password_hash: "",
    timezone: "UTC",
    date_format: "MMM dd, yyyy HH:mm",
    overall_status_override: "",
    auto_resolve_hours: "4",
    notify_on_create: "1",
    notify_on_update: "1",
    notify_on_resolve: "1",
  };

  await db
    .insert(settingsTable)
    .values(
      Object.entries(defaults).map(([key, value]) => ({
        key,
        value,
        updatedAt: new Date(),
      }))
    )
    .onConflictDoNothing();
}

export async function getUptimeStats(
  db: Db,
  monitorId: string,
  days: number = 90
): Promise<{
  uptime_percent: number;
  avg_response_time: number;
  total_checks: number;
  down_checks: number;
}> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      total: count(),
      down: sql<number>`SUM(CASE WHEN ${checkHistory.status} = 'down' THEN 1 ELSE 0 END)`,
      avg: sql<number>`AVG(${checkHistory.responseTime})`,
    })
    .from(checkHistory)
    .where(and(gte(checkHistory.checkedAt, since), eq(checkHistory.monitorId, monitorId)));

  const total = Number(rows[0]?.total || 0);
  const down = Number(rows[0]?.down || 0);
  const avg = Number(rows[0]?.avg || 0);

  return {
    uptime_percent: total > 0 ? ((total - down) / total) * 100 : 100,
    avg_response_time: Math.round(avg),
    total_checks: total,
    down_checks: down,
  };
}

export async function getUptimeHistory(
  db: Db,
  monitorId: string,
  days: number = 90
): Promise<Array<{ date: string; uptime_percent: number; avg_response_time: number }>> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      date: sql<string>`date(${checkHistory.checkedAt} / 1000, 'unixepoch', 'localtime')`,
      total: count(),
      downCount: sql<number>`SUM(CASE WHEN ${checkHistory.status} = 'down' THEN 1 ELSE 0 END)`,
      avg: sql<number>`AVG(${checkHistory.responseTime})`,
    })
    .from(checkHistory)
    .where(and(gte(checkHistory.checkedAt, since), eq(checkHistory.monitorId, monitorId)))
    .groupBy(sql`date(${checkHistory.checkedAt} / 1000, 'unixepoch', 'localtime')`)
    .orderBy(sql`date(${checkHistory.checkedAt} / 1000, 'unixepoch', 'localtime')`);

  return rows.map((r) => {
    const total = Number(r.total || 0);
    const down = Number(r.downCount || 0);
    return {
      date: r.date,
      uptime_percent: total > 0 ? ((total - down) / total) * 100 : 100,
      avg_response_time: Math.round(Number(r.avg || 0)),
    };
  });
}

export async function getUptimeBars(
  db: Db,
  monitorId: string,
  days: number = 90
): Promise<Array<{ date: string; color: string; uptime: number }>> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      date: sql<string>`date(${checkHistory.checkedAt} / 1000, 'unixepoch', 'localtime')`,
      total: count(),
      downCount: sql<number>`SUM(CASE WHEN ${checkHistory.status} = 'down' THEN 1 ELSE 0 END)`,
    })
    .from(checkHistory)
    .where(and(gte(checkHistory.checkedAt, since), eq(checkHistory.monitorId, monitorId)))
    .groupBy(sql`date(${checkHistory.checkedAt} / 1000, 'unixepoch', 'localtime')`)
    .orderBy(sql`date(${checkHistory.checkedAt} / 1000, 'unixepoch', 'localtime')`);

  return rows.map((r) => {
    const total = Number(r.total || 0);
    const down = Number(r.downCount || 0);
    const uptime = total > 0 ? ((total - down) / total) * 100 : 100;
    let color = "#00b341";
    if (uptime < 99) color = "#f1c40f";
    if (uptime < 95) color = "#e74c3c";
    return { date: r.date, color, uptime };
  });
}

export async function getOverallStatus(
  db: Db
): Promise<{ status: string; description: string; indicator: string }> {
  const rows = await db.select({ status: components.status }).from(components);

  if (rows.length === 0) {
    return { status: "operational", description: "No components configured", indicator: "none" };
  }

  const statusPriority: Record<string, number> = {
    major_outage: 5,
    partial_outage: 4,
    degraded_performance: 3,
    under_maintenance: 2,
    operational: 1,
  };

  let worstStatus = "operational";
  let worstPriority = 1;

  for (const r of rows) {
    const priority = statusPriority[r.status] || 1;
    if (priority > worstPriority) {
      worstPriority = priority;
      worstStatus = r.status;
    }
  }

  const descriptions: Record<string, { description: string; indicator: string }> = {
    operational: { description: "All Systems Operational", indicator: "none" },
    degraded_performance: { description: "Degraded Performance", indicator: "minor" },
    partial_outage: { description: "Partial System Outage", indicator: "major" },
    major_outage: { description: "Major System Outage", indicator: "critical" },
    under_maintenance: { description: "Under Maintenance", indicator: "maintenance" },
  };

  return { status: worstStatus, ...descriptions[worstStatus] };
}
