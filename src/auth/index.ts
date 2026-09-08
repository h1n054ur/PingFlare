import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

export type CloudflareBindings = {
  pingflare_db: D1Database;
  SCHEDULER: DurableObjectNamespace;
  ADMIN_PASSWORD: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
  [key: string]: unknown;
};

export function createAuth(env: CloudflareBindings, baseURL?: string) {
  return betterAuth({
    baseURL: baseURL || env.BETTER_AUTH_URL || "http://localhost:8787",
    secret: env.BETTER_AUTH_SECRET,
    ...withCloudflare(
      {
        d1Native: env.pingflare_db,
      },
      {
        emailAndPassword: {
          enabled: true,
          disableSignUp: true,
          minPasswordLength: 8,
        },
        session: {
          cookieCache: {
            enabled: true,
            maxAge: 5 * 60,
          },
        },
        advanced: {
          cookiePrefix: "pingflare",
          defaultCookieAttributes: {
            sameSite: "lax",
          },
        },
      }
    ),
  });
}

export type Auth = ReturnType<typeof createAuth>;
