import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { db } from "./store";

const windowMs = 10 * 60 * 1000;
const maxAttempts = 12;

let schema: Promise<unknown> | undefined;

export async function allowOrderLookup(requestHeaders: Headers) {
  const client = await db();
  schema ??= client.execute(`
    CREATE TABLE IF NOT EXISTS order_lookup_attempts (
      window_start INTEGER NOT NULL,
      client_hash TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      PRIMARY KEY (window_start, client_hash)
    )
  `).catch((error) => {
    schema = undefined;
    throw error;
  });
  await schema;

  // Vercel and the VPS Caddy proxy supply the client address.
  const forwarded = process.env.VERCEL === "1"
    ? requestHeaders.get("x-vercel-forwarded-for")
    : requestHeaders.get("x-forwarded-for");
  const address = forwarded?.split(",").at(-1)?.trim() ?? "";
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const clientHash = createHash("sha256").update(`${windowStart}:${isIP(address) ? address : "unknown"}`).digest("hex");
  const [, attempt] = await client.batch([
    { sql: "DELETE FROM order_lookup_attempts WHERE window_start < ?", args: [windowStart - windowMs] },
    {
      sql: `
        INSERT INTO order_lookup_attempts (window_start, client_hash, attempts) VALUES (?, ?, 1)
        ON CONFLICT (window_start, client_hash) DO UPDATE SET attempts = attempts + 1
        WHERE attempts < ?
      `,
      args: [windowStart, clientHash, maxAttempts],
    },
  ], "write");
  return attempt.rowsAffected > 0;
}
