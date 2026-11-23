import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { doorPhotos, initialDoors, maxDoorPhotos, type Door } from "./doors";

type DoorRow = { record: string; image: Uint8Array | null; mime: string | null };
type SqlValue = string | Uint8Array | null;
type Statement<Row> = {
  run(...params: SqlValue[]): { changes: number | bigint };
  get(...params: SqlValue[]): Row | undefined;
  all(...params: SqlValue[]): Row[];
};
type SqliteDatabase = {
  exec(sql: string): void;
  prepare<Row = DoorRow>(sql: string): Statement<Row>;
};

let database: SqliteDatabase | undefined;

export function db() {
  if (database) return database;

  const directory = resolve(/*turbopackIgnore: true*/ process.env.DOOR_DATA_DIR || ".door-data");
  mkdirSync(directory, { recursive: true });
  // Node 24 provides SQLite. The project's Node 20 type definitions predate it.
  const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as {
    DatabaseSync: new (filename: string) => SqliteDatabase;
  };
  const opened = new DatabaseSync(join(directory, "doors.sqlite"));
  opened.exec("PRAGMA busy_timeout = 5000");
  opened.exec("PRAGMA foreign_keys = ON");
  opened.exec("BEGIN IMMEDIATE");
  try {
    opened.exec(`
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
    if (opened.prepare("INSERT OR IGNORE INTO catalog_setup VALUES (1)").run().changes) {
      const seed = opened.prepare("INSERT INTO doors (id, record) VALUES (?, ?)");
      for (const door of initialDoors) seed.run(door.id, JSON.stringify(door));
    }
    opened.exec("COMMIT");
  } catch (error) {
    opened.exec("ROLLBACK");
    throw error;
  }
  database = opened;
  return opened;
}

export function listDoors(): Door[] {
  return db().prepare("SELECT record FROM doors ORDER BY rowid").all()
    .map(({ record }) => JSON.parse(record) as Door);
}

export function getDoor(id: string): Door | undefined {
  const row = db().prepare("SELECT record FROM doors WHERE id = ?").get(id);
  return row && JSON.parse(row.record) as Door;
}

export function getDoorImage(id: string, photo: string | null) {
  if (photo !== null) {
    return db().prepare("SELECT image, mime FROM door_photos WHERE door_id = ? AND id = ?").get(id, photo);
  }
  return db().prepare("SELECT image, mime FROM doors WHERE id = ?").get(id);
}

type PhotoUpload = { bytes: Uint8Array; mime: string };

export function saveDoor(door: Door, edit: boolean, uploads: PhotoUpload[], removePhotos: Set<string>) {
  const database = db();
  database.exec("BEGIN IMMEDIATE");
  try {
    const current = edit ? getDoor(door.id) : undefined;
    if (edit && !current) {
      database.exec("ROLLBACK");
      return "missing";
    }
    const existing = current ? doorPhotos(current) : [];
    const retained = existing.filter((url) => !removePhotos.has(url));
    if (retained.length + uploads.length > maxDoorPhotos) {
      database.exec("ROLLBACK");
      return "too-many-photos";
    }

    const added = uploads.map((upload) => ({ ...upload, id: randomUUID() }));
    const photoPrefix = `/door-image/${door.id}?photo=`;
    const images = [...retained, ...added.map((photo) => photoPrefix + photo.id)];
    const record = JSON.stringify({
      ...door, images, image: images[0] ?? "",
      illustrative: Boolean(current?.illustrative && retained.some((url) => url.startsWith("/doors/"))),
    });
    if (edit) database.prepare("UPDATE doors SET record = ? WHERE id = ?").run(record, door.id);
    else database.prepare("INSERT INTO doors (id, record) VALUES (?, ?)").run(door.id, record);

    const insert = database.prepare("INSERT INTO door_photos (id, door_id, image, mime) VALUES (?, ?, ?, ?)");
    for (const photo of added) insert.run(photo.id, door.id, photo.bytes, photo.mime);

    const remove = database.prepare("DELETE FROM door_photos WHERE door_id = ? AND id = ?");
    for (const url of existing) {
      if (!removePhotos.has(url)) continue;
      if (url.startsWith(photoPrefix)) remove.run(door.id, url.slice(photoPrefix.length));
      else if (url.startsWith(`/door-image/${door.id}?v=`)) {
        database.prepare("UPDATE doors SET image = NULL, mime = NULL WHERE id = ?").run(door.id);
      }
    }
    database.exec("COMMIT");
    return "saved";
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function deleteDoor(id: string) {
  db().prepare("DELETE FROM doors WHERE id = ?").run(id);
}
