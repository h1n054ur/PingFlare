import { hashPassword } from "@better-auth/utils/password";

export async function createAdminUser(
  db: D1Database,
  email: string,
  password: string,
  name = "Admin"
): Promise<{ id: string; email: string }> {
  const now = Date.now();
  const userId = crypto.randomUUID();
  const hashed = await hashPassword(password);

  await db.batch([
    db.prepare(
      `INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)`
    ).bind(userId, name, email, now, now),
    db.prepare(
      `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
       VALUES (?, ?, 'credential', ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), userId, userId, hashed, now, now),
  ]);

  return { id: userId, email };
}

export async function adminUserExists(db: D1Database): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT id FROM account WHERE provider_id = 'credential' LIMIT 1`
    )
    .first();
  return !!row;
}

export async function resetAdminUser(
  db: D1Database,
  email: string,
  password: string,
  name = "Admin"
): Promise<{ id: string; email: string }> {
  const now = Date.now();
  const userId = crypto.randomUUID();
  const hashed = await hashPassword(password);

  await db.batch([
    db.prepare(
      `DELETE FROM session WHERE user_id IN (SELECT user_id FROM account WHERE provider_id = 'credential')`
    ),
    db.prepare(`DELETE FROM account WHERE provider_id = 'credential'`),
    db.prepare(`DELETE FROM user WHERE id NOT IN (SELECT DISTINCT user_id FROM account WHERE provider_id <> 'credential')`),
    db.prepare(
      `INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)`
    ).bind(userId, name, email, now, now),
    db.prepare(
      `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
       VALUES (?, ?, 'credential', ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), userId, userId, hashed, now, now),
  ]);

  return { id: userId, email };
}
