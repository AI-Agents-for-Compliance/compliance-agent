import { PgBoss } from "pg-boss";
import { COLLECT_ALL_JOB, COLLECT_JOB } from "./collect-job";

let shared: PgBoss | undefined;

/** Startet pg-boss (eigenes Schema "pgboss") und legt die Warteschlangen an. */
export async function startBoss(connectionString: string = process.env.DATABASE_URL ?? ""): Promise<PgBoss> {
  if (!connectionString) throw new Error("DATABASE_URL fehlt");
  const boss = new PgBoss(connectionString);
  boss.on("error", (e) => console.error("pg-boss:", e));
  await boss.start();
  await boss.createQueue(COLLECT_JOB, { retryLimit: 3, retryDelay: 300, retryBackoff: true });
  await boss.createQueue(COLLECT_ALL_JOB);
  shared = boss;
  return boss;
}

export function getBoss(): PgBoss {
  if (!shared) throw new Error("pg-boss ist nicht gestartet");
  return shared;
}

/** Reiht eine Sammlung ein; singletonKey verhindert parallele Läufe je Mandant. */
export async function enqueueCollection(tenantId: string): Promise<string | null> {
  return getBoss().send(COLLECT_JOB, { tenantId }, { singletonKey: tenantId });
}
