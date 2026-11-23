import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient, type Client, type Transaction } from "@libsql/client";
import { doorPhotos, initialDoors, maxDoorPhotos, type Door } from "./doors";

let database: Promise<Client> | undefined;
type SqlReader = Pick<Client, "execute">;

export function compactDoorUploads() {
  return process.env.VERCEL === "1" || Boolean(process.env.TURSO_DATABASE_URL);
}

export function db() {
  database ??= openDatabase().catch((error) => {
    database = undefined;
    throw error;
  });
  return database;
}

async function openDatabase() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (url || authToken || process.env.VERCEL === "1") {
    if (!url || !authToken) throw new Error("Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN for this deployment.");
    const endpoint = new URL(url.replace(/^libsql:\/\//, "https://"));
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) {
      throw new Error("TURSO_DATABASE_URL must be a secure Turso URL.");
    }
    const client = createClient({ url: endpoint.href, authToken });
    try {
      const { rows } = await client.execute("SELECT id FROM catalog_setup WHERE id = 1");
      if (!rows.length) throw new Error("Catalog migration marker is missing.");
      return client;
    } catch (error) {
      client.close();
      if (error instanceof Error && /no such table|marker is missing/i.test(error.message)) {
        throw new Error("Import the catalog SQLite snapshot into Turso before starting the site.", { cause: error });
      }
      throw error;
    }
  }
  const directory = resolve(/*turbopackIgnore: true*/ process.env.DOOR_DATA_DIR || ".door-data");
  mkdirSync(directory, { recursive: true });
  const opened = createClient({ url: pathToFileURL(join(directory, "doors.sqlite")).href });
  try {
    await inTransaction(opened, async (tx) => {
      await tx.executeMultiple(`
      CREATE TABLE IF NOT EXISTS doors (
        id TEXT PRIMARY KEY, record TEXT NOT NULL, image BLOB, mime TEXT
      );
      CREATE TABLE IF NOT EXISTS door_photos (
        id TEXT PRIMARY KEY, door_id TEXT NOT NULL REFERENCES doors(id) ON DELETE CASCADE,
        image BLOB NOT NULL, mime TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS door_photos_door_id ON door_photos(door_id);
      CREATE TABLE IF NOT EXISTS catalog_setup (id INTEGER PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        reference TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL,
        bank_transaction TEXT UNIQUE,
        record TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS orders_qpay_callback
        ON orders (json_extract(record, '$.payment.callbackToken'));
      CREATE UNIQUE INDEX IF NOT EXISTS orders_qpay_invoice
        ON orders (json_extract(record, '$.payment.invoice.id'));
      `);
      if ((await tx.execute("INSERT OR IGNORE INTO catalog_setup VALUES (1)")).rowsAffected) {
        await tx.batch(initialDoors.map((door) => ({
          sql: "INSERT INTO doors (id, record) VALUES (?, ?)", args: [door.id, JSON.stringify(door)],
        })));
      }
    });
    return opened;
  } catch (error) {
    opened.close();
    throw error;
  }
}

async function inTransaction<T>(client: Client, operation: (tx: Transaction) => Promise<T>) {
  const tx = await client.transaction("write");
  try {
    const result = await operation(tx);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback().catch(() => undefined);
    throw error;
  } finally {
    tx.close();
  }
}

export async function writeDatabase<T>(operation: (tx: Transaction) => Promise<T>) {
  return inTransaction(await db(), operation);
}

export async function listDoors(): Promise<Door[]> {
  return (await (await db()).execute("SELECT record FROM doors ORDER BY rowid")).rows
    .map(({ record }) => JSON.parse(String(record)) as Door);
}

export async function getDoor(id: string, reader?: SqlReader): Promise<Door | undefined> {
  const { rows: [row] } = await (reader ?? await db()).execute({ sql: "SELECT record FROM doors WHERE id = ?", args: [id] });
  return row && JSON.parse(String(row.record)) as Door;
}

export async function getDoorImage(id: string, photo: string | null) {
  const client = await db();
  const result = photo === null
    ? await client.execute("SELECT image, mime FROM doors WHERE id = ?", [id])
    : await client.execute("SELECT image, mime FROM door_photos WHERE door_id = ? AND id = ?", [id, photo]);
  const row = result.rows[0];
  if (row?.image instanceof ArrayBuffer && typeof row.mime === "string") return { image: row.image, mime: row.mime };
}

type PhotoUpload = { bytes: Uint8Array; mime: string };

export function saveDoor(door: Door, edit: boolean, uploads: PhotoUpload[], removePhotos: Set<string>) {
  return writeDatabase(async (tx) => {
    const current = edit ? await getDoor(door.id, tx) : undefined;
    if (edit && !current) return "missing";
    const existing = current ? doorPhotos(current) : [];
    const retained = existing.filter((url) => !removePhotos.has(url));
    if (retained.length + uploads.length > maxDoorPhotos) {
      return "too-many-photos";
    }

    const added = uploads.map((upload) => ({ ...upload, id: randomUUID() }));
    const photoPrefix = `/door-image/${door.id}?photo=`;
    const images = [...retained, ...added.map((photo) => photoPrefix + photo.id)];
    const record = JSON.stringify({
      ...door, images, image: images[0] ?? "",
      illustrative: Boolean(current?.illustrative && retained.some((url) => url.startsWith("/doors/"))),
    });
    const statements = [{
      sql: edit ? "UPDATE doors SET record = ? WHERE id = ?" : "INSERT INTO doors (record, id) VALUES (?, ?)",
      args: [record, door.id],
    }];
    for (const url of existing) {
      if (!removePhotos.has(url)) continue;
      if (url.startsWith(photoPrefix)) {
        statements.push({ sql: "DELETE FROM door_photos WHERE door_id = ? AND id = ?", args: [door.id, url.slice(photoPrefix.length)] });
      }
      else if (url.startsWith(`/door-image/${door.id}?v=`)) {
        statements.push({ sql: "UPDATE doors SET image = NULL, mime = NULL WHERE id = ?", args: [door.id] });
      }
    }
    await tx.batch(statements);
    for (const photo of added) {
      await tx.execute({ sql: "INSERT INTO door_photos (id, door_id, image, mime) VALUES (?, ?, ?, ?)",
        args: [photo.id, door.id, photo.bytes, photo.mime] });
    }
    return "saved";
  });
}

export function deleteDoor(id: string) {
  return writeDatabase(async (tx) => {
    await tx.batch([
      { sql: "DELETE FROM door_photos WHERE door_id = ?", args: [id] },
      { sql: "DELETE FROM doors WHERE id = ?", args: [id] },
    ]);
  });
}
