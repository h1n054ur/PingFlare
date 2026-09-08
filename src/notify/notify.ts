export interface NotifyConfig {
  webhooks: Array<{ id: string; name: string; url: string; type: "generic" | "slack" | "discord" | "telegram" }>;
  email: {
    provider: "sendgrid" | "ses" | "smtp" | "mailchannels" | "cloudflare";
    from: string;
    to: string[];
    apiKey?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
  };
  sms: {
    provider: "twilio";
    accountSid?: string;
    authToken?: string;
    from?: string;
    to: string[];
  };
  webhookMode: boolean;
}

export type NotificationEvent =
  | "incident.created"
  | "incident.updated"
  | "incident.resolved"
  | "maintenance.scheduled"
  | "maintenance.started"
  | "maintenance.completed"
  | "test";

export interface NotificationPayload {
  event: NotificationEvent;
  title: string;
  message: string;
  url?: string;
  severity?: string;
  status?: string;
  incidentId?: string;
  monitorName?: string;
  componentName?: string;
  timestamp: number;
  timezone?: string;
}

function formatMessageForChannel(payload: NotificationPayload, channel: string): string {
  const time = new Date(payload.timestamp).toLocaleString(undefined, {
    timeZone: payload.timezone || "UTC",
  });

  const lines = [
    `[${payload.event}] ${payload.title}`,
    payload.message,
  ];

  if (payload.monitorName) lines.push(`Monitor: ${payload.monitorName}`);
  if (payload.componentName) lines.push(`Component: ${payload.componentName}`);
  if (payload.severity) lines.push(`Severity: ${payload.severity}`);
  if (payload.status) lines.push(`Status: ${payload.status}`);
  lines.push(`Time: ${time}`);
  if (payload.url) lines.push(`Link: ${payload.url}`);

  return lines.join("\n");
}

import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "../db";
import { notificationChannels, subscribers } from "../db/schema";

/**
 * Dispatch a notification to all configured channels (webhooks + email + SMS).
 */
export async function dispatchNotification(
  env: Record<string, string | undefined>,
  db: Db,
  payload: NotificationPayload
): Promise<void> {
  await Promise.allSettled([
    sendWebhooks(env, db, payload),
    sendEmail(env, db, payload),
    sendSms(env, db, payload),
  ]);
}

async function sendWebhooks(
  env: Record<string, string | undefined>,
  db: Db,
  payload: NotificationPayload
): Promise<void> {
  const channels = await db
    .select()
    .from(notificationChannels)
    .where(
      and(
        inArray(notificationChannels.type, ["webhook", "slack", "discord", "telegram"]),
        eq(notificationChannels.enabled, true)
      )
    );

  for (const channel of channels) {
    if (!channel.url) continue;
    const text = formatMessageForChannel(payload, channel.type);

    let body: string;
    let contentType = "application/json";

    switch (channel.type) {
      case "slack": {
        body = JSON.stringify({
          text,
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text },
              fields: [],
            },
          ],
        });
        break;
      }
      case "discord": {
        body = JSON.stringify({
          content: text,
          embeds: [
            {
              title: payload.title,
              description: payload.message,
              color: payload.event.includes("resolved") || payload.event.includes("completed")
                ? 0x00b341
                : 0xed4245,
              timestamp: new Date(payload.timestamp).toISOString(),
              fields: buildEmbedFields(payload),
            },
          ],
        });
        break;
      }
      case "telegram": {
        const config = parseConfig<{ chat_id?: string }>(channel.config);
        const chatId = config?.chat_id || env.TELEGRAM_CHAT_ID;
        const botToken = env.TELEGRAM_BOT_TOKEN;
        if (!botToken || !chatId) continue;
        const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        body = JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" });
        await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        continue;
      }
      default: {
        body = JSON.stringify({ ...payload, text, time: new Date(payload.timestamp).toISOString() });
      }
    }

    try {
      await fetch(channel.url, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body,
      });
    } catch (err) {
      console.error(`Webhook ${channel.id} (${channel.type}) failed:`, err);
    }
  }

  // Fallback to env-configured webhooks
  if (env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(env.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: formatMessageForChannel(payload, "slack") }),
      });
    } catch {}
  }

  if (env.DISCORD_WEBHOOK_URL) {
    try {
      await fetch(env.DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: formatMessageForChannel(payload, "discord") }),
      });
    } catch {}
  }
}

function buildEmbedFields(payload: NotificationPayload): Array<{ name: string; value: string; inline: boolean }> {
  const fields: Array<{ name: string; value: string; inline: boolean }> = [];
  if (payload.severity) fields.push({ name: "Severity", value: payload.severity, inline: true });
  if (payload.status) fields.push({ name: "Status", value: payload.status, inline: true });
  if (payload.monitorName) fields.push({ name: "Monitor", value: payload.monitorName, inline: true });
  if (payload.componentName) fields.push({ name: "Component", value: payload.componentName, inline: true });
  return fields;
}

function parseConfig<T>(config: string | null | undefined): T | null {
  if (!config) return null;
  try {
    return JSON.parse(config) as T;
  } catch {
    return null;
  }
}

async function sendEmail(
  env: Record<string, string | undefined>,
  db: Db,
  payload: NotificationPayload
): Promise<void> {
  // Fetch subscribers to notify
  const rows = await db
    .select({ email: subscribers.email })
    .from(subscribers)
    .where(eq(subscribers.verified, true));
  const subscriberEmails = rows.map((s) => s.email);
  if (subscriberEmails.length === 0 && !env.NOTIFY_ADMIN_EMAIL) return;

  const to = [...new Set([...(env.NOTIFY_ADMIN_EMAIL ? [env.NOTIFY_ADMIN_EMAIL] : []), ...subscriberEmails])];
  if (to.length === 0) return;

  const subject = `[PingFlare] ${payload.event.replace(/\./g, " ")} - ${payload.title}`;
  const htmlBody = buildEmailHtml(payload);

  const provider = (env.EMAIL_PROVIDER || "sendgrid").toLowerCase();

  switch (provider) {
    case "sendgrid": {
      if (!env.SENDGRID_API_KEY) return;
      const from =
        (env.EMAIL_FROM || "").match(/<(.+)>/)?.[1] ||
        env.EMAIL_FROM ||
        "status@pingflare.com";
      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: to.map((e) => ({ email: e })) }],
          from: { email: from },
          subject,
          content: [{ type: "text/html", value: htmlBody }],
        }),
      });
      break;
    }

    case "cloudflare": {
      // Cloudflare Email Workers via /api/email/send edge function (self-hosted)
      // We build a mailto: approach or use a worker route. For now, log.
      console.log("Cloudflare email routing configured - use Email Workers to relay");
      break;
    }

    case "smtp": {
      // Fallback via SMTP (not possible from edge directly; log for clarity)
      console.log("SMTP not supported from edge - use SendGrid, SES, or mailchannels");
      break;
    }

    case "mailchannels": {
      if (!env.MAILCHANNELS_DOMAIN) return;
      await fetch("https://api.mailchannels.net/tx/v1/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: to.map((e) => ({ email: e })) }],
          from: { email: env.EMAIL_FROM || "status@pingflare.com" },
          subject,
          content: [{ type: "text/html", value: htmlBody }],
        }),
      });
      break;
    }

    case "ses": {
      if (!env.AWS_SES_REGION || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) return;
      await sendViaSes(env, to, subject, htmlBody);
      break;
    }
  }
}

async function sendViaSes(
  env: Record<string, string | undefined>,
  to: string[],
  subject: string,
  html: string
): Promise<void> {
  try {
    const region = env.AWS_SES_REGION as string;
    const from = env.EMAIL_FROM || "status@pingflare.com";
    const date = new Date().toUTCString();
    const messageId = crypto.randomUUID();
    const endpoint = `https://email.${region}.amazonaws.com/v2/email/outbound-emails`;
    const payload = {
      FromEmailAddress: from,
      Destination: { ToAddresses: to },
      Content: {
        Simple: {
          Subject: { Data: subject },
          Body: { Html: { Data: html } },
        },
      },
    };

    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Amz-Date": date,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("SES send failed:", err);
  }
}

function buildEmailHtml(payload: NotificationPayload): string {
  const severityColor: Record<string, string> = {
    critical: "#dc2626",
    major: "#ea580c",
    minor: "#eab308",
    none: "#22c55e",
  };

  const color = severityColor[payload.severity || "none"] || "#3b82f6";

  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
    <div style="background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="background: ${color}; padding: 16px 24px;">
        <h2 style="margin: 0; color: #fff; font-size: 18px;">${payload.title}</h2>
      </div>
      <div style="padding: 24px;">
        <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6;">${payload.message}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${buildInfoRow("Event", payload.event)}
          ${buildInfoRow("Status", payload.status || "")}
          ${buildInfoRow("Severity", payload.severity || "")}
          ${buildInfoRow("Monitor", payload.monitorName || "")}
          ${buildInfoRow("Component", payload.componentName || "")}
          ${buildInfoRow("Time", new Date(payload.timestamp).toLocaleString())}
        </table>
        ${payload.url ? `<p style="margin: 16px 0 0;"><a href="${payload.url}" style="color: #2563eb; text-decoration: underline;">View status page</a></p>` : ""}
      </div>
    </div>
  </div>
  `;
}

function buildInfoRow(label: string, value: string): string {
  if (!value) return "";
  return `
    <tr>
      <td style="padding: 8px 0; color: #6b7280; font-weight: 500; width: 120px; vertical-align: top;">${label}</td>
      <td style="padding: 8px 0; color: #111827;">${value}</td>
    </tr>
  `;
}

async function sendSms(
  env: Record<string, string | undefined>,
  db: Db,
  payload: NotificationPayload
): Promise<void> {
  const provider = (env.SMS_PROVIDER || "").toLowerCase();
  if (provider !== "twilio") return;

  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_FROM_NUMBER;
  const tos = (env.TWILIO_TO_NUMBERS || "").split(",").map((s) => s.trim()).filter(Boolean);

  if (!accountSid || !authToken || !from || tos.length === 0) return;

  const message = `[PingFlare] ${payload.title}\n${payload.message}`;

  for (const to of tos) {
    const formData = new URLSearchParams();
    formData.append("To", to);
    formData.append("From", from);
    formData.append("Body", message);

    const basicAuth = btoa(`${accountSid}:${authToken}`);
    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );
  }
}
