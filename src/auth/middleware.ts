import { createMiddleware } from "hono/factory";
import { createAuth, type CloudflareBindings } from "../auth";

type AuthEnv = {
  Bindings: CloudflareBindings;
  Variables: {
    session: {
      user: { id: string; email: string; name: string } | null;
      session: unknown;
    } | null;
  };
};

export const sessionMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const auth = createAuth(c.env, new URL(c.req.url).origin);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  c.set("session", session as any);
  await next();
});

export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const auth = createAuth(c.env, new URL(c.req.url).origin);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("session", session as any);
  await next();
});
