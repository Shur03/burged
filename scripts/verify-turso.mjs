import { createClient } from "@libsql/client";
import { DatabaseSync } from "node:sqlite";

const tables = [
  ["catalog_setup", ["id"]],
  ["doors", ["id", "record", "mime", "length(image) AS image_bytes"]],
  ["door_photos", ["id", "door_id", "mime", "length(image) AS image_bytes"]],
  ["orders", ["id", "reference", "created_at", "status", "bank_transaction", "record"]],
];

async function verify(snapshot) {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!snapshot || !url || !authToken) {
    throw new Error("Usage: set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN, then pass the SQLite snapshot path.");
  }
  const endpoint = new URL(url.replace(/^libsql:\/\//, "https://"));
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) throw new Error("Use a secure Turso database URL.");

  const remote = createClient({ url: endpoint.href, authToken });
  const local = new DatabaseSync(snapshot, { readOnly: true });
  try {
    const counts = {};
    let uploadedPhotos = 0;
    for (const [table, columns] of tables) {
      const query = `SELECT ${columns.join(", ")} FROM ${table} ORDER BY rowid`;
      const expected = local.prepare(query).all();
      const { rows } = await remote.execute(query);
      if (expected.length !== rows.length) throw new Error(`${table}: record count differs.`);
      for (const [index, original] of expected.entries()) {
        if (Object.keys(original).some((key) => original[key] !== rows[index][key])) {
          throw new Error(`${table}: record ${index + 1} differs.`);
        }
        if (original.image_bytes === null || original.image_bytes === undefined) continue;
        const chunk = 256 * 1024;
        const sql = `SELECT substr(image, ?, ?) AS bytes FROM ${table} WHERE id = ?`;
        for (let offset = 0; offset < original.image_bytes; offset += chunk) {
          const args = [offset + 1, chunk, original.id];
          const originalBytes = local.prepare(sql).get(...args).bytes;
          const imported = (await remote.execute(sql, args)).rows[0]?.bytes;
          if (!(imported instanceof ArrayBuffer) || !Buffer.from(imported).equals(originalBytes)) {
            throw new Error(`${table}: image ${index + 1} differs.`);
          }
        }
        uploadedPhotos++;
      }
      counts[table] = rows.length;
    }
    console.log(JSON.stringify({ doors: counts.doors, uploadedPhotos, orders: counts.orders }));
  } finally {
    local.close();
    remote.close();
  }
}

try {
  await verify(process.argv[2]);
} catch (error) {
  // Report results without order contents, API tokens, or remote connection details.
  const detail = error instanceof Error ? error.message : "";
  const safeMessage = /^(Usage:|Use a secure|doors:|door_photos:|orders:|catalog_setup:)/.test(detail);
  console.error(safeMessage ? detail : `Database verification failed (${error?.code ?? "unknown error"}).`);
  process.exitCode = 1;
}
