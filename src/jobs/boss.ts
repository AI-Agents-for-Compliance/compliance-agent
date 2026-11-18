import { PgBoss } from "pg-boss";
import { COLLECT_ALL_JOB, COLLECT_JOB } from "./collect-job";

let shared: PgBoss | undefined;
let sendBoss: Promise<PgBoss> | undefined;

const pgbossSchema = () => process.env.PGBOSS_SCHEMA || undefined;

/** Legt die Warteschlangen an (idempotent); gemeinsam für Worker und Web-Prozess, damit die Optionen nie abweichen. */
export async function ensureQueues(boss: PgBoss): Promise<void> {
  // Policy "exclusive": höchstens ein wartender oder laufender Job je singletonKey (Mandant).
  // Mit der Standard-Policy wäre singletonKey wirkungslos. Eine spätere Änderung der Policy
  // erfordert, die Queue neu anzulegen (deleteQueue + createQueue).
  await boss.createQueue(COLLECT_JOB, { policy: "exclusive", retryLimit: 3, retryDelay: 300, retryBackoff: true });
  await boss.createQueue(COLLECT_ALL_JOB);
}

/** Startet pg-boss (Schema aus Parameter bzw. PGBOSS_SCHEMA, sonst "pgboss") und legt die Warteschlangen an. */
export async function startBoss(
  connectionString: string = process.env.DATABASE_URL ?? "",
  schema: string | undefined = pgbossSchema(),
): Promise<PgBoss> {
  if (!connectionString) throw new Error("DATABASE_URL fehlt");
  const boss = new PgBoss({ connectionString, ...(schema ? { schema } : {}) });
  boss.on("error", (e) => console.error("pg-boss:", e));
  await boss.start();
  await ensureQueues(boss);
  shared = boss;
  return boss;
}

/**
 * Prozessweite, lazy gestartete Instanz nur zum Einreihen (Web-Prozess): ohne Wartung/Supervisor
 * und ohne Cron-Scheduling; der Worker bleibt dafür zuständig.
 */
export function getSendBoss(
  connectionString: string = process.env.DATABASE_URL ?? "",
  schema: string | undefined = pgbossSchema(),
): Promise<PgBoss> {
  if (shared) return Promise.resolve(shared);
  sendBoss ??= (async () => {
    if (!connectionString) throw new Error("DATABASE_URL fehlt");
    const boss = new PgBoss({
      connectionString,
      ...(schema ? { schema } : {}),
      supervise: false,
      schedule: false,
      max: 2,
    });
    boss.on("error", (e) => console.error("pg-boss:", e));
    try {
      await boss.start();
      await ensureQueues(boss);
    } catch (e) {
      sendBoss = undefined; // nächster Aufruf versucht es erneut
      await boss.stop({ graceful: false }).catch(() => undefined);
      throw e;
    }
    return boss;
  })();
  return sendBoss;
}

/** Stoppt die Send-Instanz (Tests, Prozessende). */
export async function stopSendBoss(): Promise<void> {
  const p = sendBoss;
  sendBoss = undefined;
  if (p) await (await p).stop({ graceful: false });
}

export function getBoss(): PgBoss {
  if (!shared) throw new Error("pg-boss ist nicht gestartet");
  return shared;
}

/** Reiht eine Sammlung ein; singletonKey verhindert parallele Läufe je Mandant. */
export async function enqueueCollection(tenantId: string): Promise<string | null> {
  return (await getSendBoss()).send(COLLECT_JOB, { tenantId }, { singletonKey: tenantId });
}
