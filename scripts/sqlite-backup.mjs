import { chmodSync, existsSync, linkSync, mkdirSync, mkdtempSync, readdirSync, statSync, unlinkSync, rmdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";

const snapshotName = /^doors-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.sqlite$/;

function openDatabase(file) {
  if (!statSync(file).isFile()) throw new Error(`Expected a SQLite file at ${file}`);
  const database = new DatabaseSync(file, { readOnly: true });
  database.exec("PRAGMA busy_timeout = 10000");
  return database;
}

function inspect(file) {
  const database = openDatabase(file);
  try {
    const integrity = database.prepare("PRAGMA integrity_check").all();
    if (integrity.length !== 1 || integrity[0].integrity_check !== "ok") {
      throw new Error("SQLite integrity check failed");
    }
    if (database.prepare("PRAGMA foreign_key_check").get()) throw new Error("SQLite foreign key check failed");

    const exists = database.prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = ?");
    if (!exists.get("doors") || !exists.get("orders") || !exists.get("catalog_setup")) {
      throw new Error("Snapshot does not contain the catalog and order tables");
    }
    const { doors, uploadedLegacyPhotos } = database.prepare(`
      SELECT COUNT(*) AS doors, COUNT(image) AS uploadedLegacyPhotos FROM doors
    `).get();
    const { orders } = database.prepare("SELECT COUNT(*) AS orders FROM orders").get();
    const galleryPhotos = exists.get("door_photos")
      ? database.prepare("SELECT COUNT(*) AS count FROM door_photos").get().count : 0;
    return { doors, uploadedPhotos: uploadedLegacyPhotos + galleryPhotos, orders };
  } finally {
    database.close();
  }
}

async function copyVerified(sourceFile, destinationFile) {
  const database = openDatabase(sourceFile);
  const folder = dirname(destinationFile);
  let staging;
  try {
    mkdirSync(folder, { recursive: true, mode: 0o700 });
    staging = mkdtempSync(join(folder, ".sqlite-backup-"));
    const temporary = join(staging, "snapshot.sqlite");
    await backup(database, temporary, { rate: 256 });
    chmodSync(temporary, 0o600);
    const counts = inspect(temporary);
    // Publish the validated file atomically without replacing an existing database.
    linkSync(temporary, destinationFile);
    return counts;
  } finally {
    database.close();
    if (staging) {
      for (const file of readdirSync(staging)) unlinkSync(join(staging, file));
      rmdirSync(staging);
    }
  }
}

function prune(directory, keep, now, days) {
  const cutoff = now - days * 86_400_000;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !snapshotName.test(entry.name)) continue;
    const candidate = join(directory, entry.name);
    if (candidate !== keep && statSync(candidate).mtimeMs < cutoff) unlinkSync(candidate);
  }
}

async function main([command, source, target, retention, ...extra]) {
  if (command === "verify" && source && !target) {
    console.log(JSON.stringify({ file: resolve(source), ...inspect(resolve(source)) }));
    return;
  }
  if (!source || !target || extra.length || !["backup", "restore"].includes(command)) {
    throw new Error("Usage: sqlite-backup.mjs backup <database> <backup-dir> [retention-days] | verify <snapshot> | restore <snapshot> <database>");
  }
  const input = resolve(source);
  if (command === "restore") {
    const destination = resolve(target);
    if (retention || ["", "-wal", "-shm", "-journal"].some((suffix) => existsSync(destination + suffix))) {
      throw new Error("Restore requires an unused destination with no SQLite sidecar files");
    }
    console.log(JSON.stringify({ file: destination, ...await copyVerified(input, destination) }));
    return;
  }

  const days = Number(retention ?? 0);
  if (!Number.isSafeInteger(days) || days < 0) throw new Error("Retention must be a nonnegative number of days");
  const now = new Date();
  const directory = resolve(target);
  const destination = join(directory, `doors-${now.toISOString().replaceAll(":", "-").replace(".", "-")}.sqlite`);
  const counts = await copyVerified(input, destination);
  if (days) prune(directory, destination, now.getTime(), days);
  console.log(JSON.stringify({ file: destination, ...counts }));
}

await main(process.argv.slice(2)).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
