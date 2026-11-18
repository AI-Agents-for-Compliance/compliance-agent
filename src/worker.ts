import { loadCatalog } from "./catalog/load";
import { registry } from "./checks/registry";
import { createGraphFetcher } from "./collectors/m365/graph";
import { closeDb, getDb } from "./db/client";
import { m365Connections } from "./db/schema";
import { eq } from "drizzle-orm";
import { enqueueCollection, startBoss } from "./jobs/boss";
import { COLLECT_ALL_JOB, COLLECT_JOB, collectJobHandler } from "./jobs/collect-job";

async function main() {
  const katalog = loadCatalog("catalog", new Set(registry.keys()));
  const boss = await startBoss();

  await boss.work<{ tenantId: string }>(COLLECT_JOB, async (jobs) => {
    for (const job of jobs) {
      await collectJobHandler(job.data.tenantId, { fetcherFor: createGraphFetcher, katalog });
    }
  });

  // Aktive Verbindungen laufen mandantenübergreifend; RLS gilt nur für app_user, diese Abfrage nutzt den Eigentümer.
  await boss.work(COLLECT_ALL_JOB, async () => {
    const aktive = await getDb()
      .select({ tenantId: m365Connections.tenantId })
      .from(m365Connections)
      .where(eq(m365Connections.status, "aktiv"));
    for (const { tenantId } of aktive) await enqueueCollection(tenantId);
  });
  await boss.schedule(COLLECT_ALL_JOB, "0 3 * * *", null, { tz: "Europe/Berlin" });

  const stop = async () => {
    await boss.stop();
    await closeDb();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  console.log("Worker gestartet");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
