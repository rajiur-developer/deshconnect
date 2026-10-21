import "server-only";

import fs from "node:fs";
import path from "node:path";

import type { Database } from "@/types/admin";
import { seedDatabase } from "@/data/seed";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");

type GlobalStore = {
  __deshconnectDb?: Database;
  __deshconnectDbPromise?: Promise<Database>;
};

const globalStore = globalThis as unknown as GlobalStore;
let writeChain: Promise<unknown> = Promise.resolve();

async function persist(db: Database): Promise<void> {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  await fs.promises.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.promises.rename(tmp, DB_PATH);
}

async function load(): Promise<Database> {
  if (globalStore.__deshconnectDb) return globalStore.__deshconnectDb;
  if (globalStore.__deshconnectDbPromise) return globalStore.__deshconnectDbPromise;

  globalStore.__deshconnectDbPromise = (async () => {
    try {
      const raw = await fs.promises.readFile(DB_PATH, "utf8");
      globalStore.__deshconnectDb = JSON.parse(raw) as Database;
    } catch {
      const db = seedDatabase();
      await persist(db);
      globalStore.__deshconnectDb = db;
    }
    return globalStore.__deshconnectDb;
  })();

  return globalStore.__deshconnectDbPromise;
}

export async function getDatabase(): Promise<Database> {
  return load();
}

export async function saveDatabase(
  mutator: (db: Database) => void | Promise<void>
): Promise<Database> {
  const db = await load();
  await mutator(db);
  writeChain = writeChain.then(() => persist(db));
  await writeChain;
  return db;
}

export async function resetDatabaseFile(): Promise<void> {
  await fs.promises.rm(DB_PATH, { force: true });
  globalStore.__deshconnectDb = undefined;
  globalStore.__deshconnectDbPromise = undefined;
}
