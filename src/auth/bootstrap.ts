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
      `INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt)
       VALUES (?, ?, ?, 1, ?, ?)`
    ).bind(userId, name, email, now, now),
    db.prepare(
      `INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt)
       VALUES (?, ?, 'credential', ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), userId, userId, hashed, now, now),
  ]);

  return { id: userId, email };
}

export async function adminUserExists(db: D1Database): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT id FROM account WHERE providerId = 'credential' LIMIT 1`
    )
    .first();
  return !!row;
}
