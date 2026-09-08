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
        user: {
          fields: {
            emailVerified: "email_verified",
            createdAt: "created_at",
            updatedAt: "updated_at",
          },
        },
        session: {
          cookieCache: {
            enabled: true,
            maxAge: 5 * 60,
          },
          fields: {
            expiresAt: "expires_at",
            createdAt: "created_at",
            updatedAt: "updated_at",
            ipAddress: "ip_address",
            userAgent: "user_agent",
            userId: "user_id",
          },
        },
        account: {
          modelName: "account",
          fields: {
            accountId: "account_id",
            providerId: "provider_id",
            userId: "user_id",
            accessToken: "access_token",
            refreshToken: "refresh_token",
            idToken: "id_token",
            accessTokenExpiresAt: "access_token_expires_at",
            refreshTokenExpiresAt: "refresh_token_expires_at",
            createdAt: "created_at",
            updatedAt: "updated_at",
          },
        },
        verification: {
          fields: {
            expiresAt: "expires_at",
            createdAt: "created_at",
            updatedAt: "updated_at",
          },
        },
        emailAndPassword: {
          enabled: true,
          disableSignUp: true,
          minPasswordLength: 8,
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
