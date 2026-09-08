import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// --- Settings ---
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// --- Component Groups ---
export const componentGroups = sqliteTable("component_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  collapsed: integer("collapsed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// --- Components ---
export const components = sqliteTable("components", {
  id: text("id").primaryKey(),
  groupId: text("group_id").references(() => componentGroups.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("operational"),
  showUptime: integer("show_uptime", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  startDate: integer("start_date", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// --- Monitors ---
export const monitors = sqliteTable("monitors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("http"),
  url: text("url"),
  method: text("method").notNull().default("GET"),
  expectedCodes: text("expected_codes").default("200"),
  keyword: text("keyword"),
  keywordForbidden: integer("keyword_forbidden", { mode: "boolean" }).notNull().default(false),
  headers: text("headers"),
  timeout: integer("timeout").default(15),
  interval: integer("interval").default(60),
  gracePeriod: integer("grace_period").default(3),
  degradedThreshold: integer("degraded_threshold").default(5000),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  status: text("status").notNull().default("unknown"),
  lastChecked: integer("last_checked", { mode: "timestamp_ms" }),
  lastResponseTime: integer("last_response_time"),
  componentId: text("component_id").references(() => components.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// --- Check History ---
export const checkHistory = sqliteTable("check_history", {
  id: text("id").primaryKey(),
  monitorId: text("monitor_id").notNull().references(() => monitors.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  responseTime: integer("response_time"),
  statusCode: integer("status_code"),
  message: text("message"),
  checkedAt: integer("checked_at", { mode: "timestamp_ms" }).notNull(),
});

// --- Check Buckets (precomputed uptime per day per monitor) ---
export const checkBuckets = sqliteTable("check_buckets", {
  id: text("id").primaryKey(),
  monitorId: text("monitor_id").notNull().references(() => monitors.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // "YYYY-MM-DD"
  totalChecks: integer("total_checks").notNull().default(0),
  upChecks: integer("up_checks").notNull().default(0),
  avgResponseTime: integer("avg_response_time").default(0),
  lastChecked: integer("last_checked", { mode: "timestamp_ms" }),
});

// --- Incidents ---
export const incidents = sqliteTable("incidents", {
  id: text("id").primaryKey(),
  monitorId: text("monitor_id").references(() => monitors.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  message: text("message"),
  status: text("status").notNull().default("investigating"),
  severity: text("severity").notNull().default("minor"),
  componentsAffected: text("components_affected"), // JSON array of component IDs
  resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// --- Incident Updates ---
export const incidentUpdates = sqliteTable("incident_updates", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull().references(() => incidents.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  message: text("message").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

// --- Maintenance ---
export const maintenances = sqliteTable("maintenances", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message"),
  status: text("status").notNull().default("scheduled"),
  scheduledStart: integer("scheduled_start", { mode: "timestamp_ms" }).notNull(),
  scheduledEnd: integer("scheduled_end", { mode: "timestamp_ms" }).notNull(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// --- Maintenance Components ---
export const maintenanceComponents = sqliteTable("maintenance_components", {
  maintenanceId: text("maintenance_id").notNull().references(() => maintenances.id, { onDelete: "cascade" }),
  componentId: text("component_id").notNull().references(() => components.id, { onDelete: "cascade" }),
});

// --- Subscribers ---
export const subscribers = sqliteTable("subscribers", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  verifyToken: text("verify_token"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

// --- Notification Channels ---
export const notificationChannels = sqliteTable("notification_channels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  url: text("url"),
  config: text("config"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// --- Status Changes (audit log) ---
export const statusChanges = sqliteTable("status_changes", {
  id: text("id").primaryKey(),
  monitorId: text("monitor_id").notNull().references(() => monitors.id, { onDelete: "cascade" }),
  oldStatus: text("old_status").notNull(),
  newStatus: text("new_status").notNull(),
  changedAt: integer("changed_at", { mode: "timestamp_ms" }).notNull(),
});

// --- Better Auth tables ---
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});
