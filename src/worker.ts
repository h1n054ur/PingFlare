import { eq, and } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { initDefaultSettings } from "./db/queries";
import { createDb, type Db } from "./db";
import { apiRoutes } from "./routes/api";
import { publicApiRoutes } from "./routes/public-api";
import { SchedulerDO } from "./scheduler";
import { createAuth, type CloudflareBindings } from "./auth";
import { createAdminUser, adminUserExists } from "./auth/bootstrap";
import { subscribers } from "./db/schema";

type Bindings = CloudflareBindings & {
  SCHEDULER: DurableObjectNamespace<SchedulerDO>;
  ASSETS: Fetcher;
  ADMIN_PASSWORD: string;
  APP_NAME: string;
};

type Variables = {
  db: Db;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", cors());

app.use("/api/*", async (c, next) => {
  c.set("db", createDb(c.env.pingflare_db));
  await next();
});

app.all("/api/auth/*", (c) => {
  const auth = createAuth(c.env, new URL(c.req.url).origin);
  return auth.handler(c.req.raw);
});

app.route("/api/admin", apiRoutes);
app.route("/api/v2", publicApiRoutes);

app.get("/api/health", (c) => c.json({ ok: true, timestamp: Date.now() }));

app.post("/api/setup", async (c) => {
  const body = await c.req
    .json<{ email?: string; password?: string; setupKey?: string }>()
    .catch(() => ({ email: undefined, password: undefined, setupKey: undefined }));

  const providedKey = body.setupKey || c.req.header("x-setup-key") || c.req.query("key");

  if (!providedKey || providedKey !== c.env.ADMIN_PASSWORD) {
    return c.json({ error: "Invalid setup key" }, 403);
  }

  if (await adminUserExists(c.env.pingflare_db)) {
    return c.json({ error: "Admin already configured" }, 400);
  }

  const email = body.email?.trim();
  const password = body.password;
  if (!email || !password || password.length < 8) {
    return c.json({ error: "email and password (min 8 chars) are required" }, 400);
  }

  const user = await createAdminUser(c.env.pingflare_db, email, password);
  return c.json({ success: true, user });
});

app.get("/api/subscribe", async (c) => {
  const email = c.req.query("email");
  const token = c.req.query("token");

  if (!email || !token) {
    return c.json({ error: "Invalid subscription link" }, 400);
  }

  const db = c.get("db");
  const subscriber = await db
    .select()
    .from(subscribers)
    .where(and(eq(subscribers.email, email), eq(subscribers.verifyToken, token)))
    .limit(1);

  if (!subscriber[0]) {
    return c.json({ error: "Invalid or expired verification link" }, 400);
  }

  await db
    .update(subscribers)
    .set({ verified: true, verifyToken: null })
    .where(eq(subscribers.email, email));

  return c.json({ success: true, message: "Email verified successfully" });
});

app.get("*", async (c) => {
  const url = new URL(c.req.url);
  if (url.pathname.startsWith("/api/")) {
    return c.json({ error: "Not found" }, 404);
  }
  const asset = await c.env.ASSETS.fetch(new Request(url, c.req.raw));
  if (asset.status === 404 && !url.pathname.includes(".")) {
    return c.env.ASSETS.fetch(new Request(new URL("/", url), c.req.raw));
  }
  return asset;
});

export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "") {
      await initDefaultSettings(createDb(env.pingflare_db));

      const schedulerId = env.SCHEDULER.idFromName("pingflare-scheduler");
      const stub = env.SCHEDULER.get(schedulerId);
      ctx.waitUntil(stub.fetch(new Request("https://internal/arm")));
    }

    return app.fetch(request, env, ctx);
  },
};

export { SchedulerDO };
