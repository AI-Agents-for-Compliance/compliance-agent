import { loadCatalog } from "../src/catalog/load";
import { registry } from "../src/checks/registry";
import { createGraphFetcher } from "../src/collectors/m365/graph";
import { closeDb } from "../src/db/client";
import { findings } from "../src/db/schema";
import { withTenant } from "../src/db/tenant";
import { pruefeLokaleDatenbank } from "../src/demo/guard";
import { createFakeGraphFetcher } from "../src/demo/fake-graph";
import { runCollection } from "../src/jobs/collect-job";
import { and, eq } from "drizzle-orm";

const args = process.argv.slice(2);
const fake = args.includes("--fake");
const tenantId = args.find((a) => !a.startsWith("--"));
if (!tenantId) {
  console.error("Aufruf: pnpm demo:collect <tenantUuid> [--fake]");
  process.exit(1);
}

async function main(id: string) {
  if (fake) pruefeLokaleDatenbank();
  else if (!process.env.M365_CLIENT_ID || !process.env.M365_CERT_PATH) {
    throw new Error("M365_CLIENT_ID und M365_CERT_PATH müssen gesetzt sein (siehe docs/entwicklung.md), oder mit --fake ausführen.");
  }
  const katalog = loadCatalog("catalog", new Set(registry.keys()));
  const fetcherFor = fake ? () => createFakeGraphFetcher() : createGraphFetcher;
  const { runId, ergebnis } = await runCollection(id, { fetcherFor, katalog });
  console.log(`Lauf ${runId}: ${ergebnis}${fake ? " (Demo-Daten)" : ""}\n`);
  const zeilen = await withTenant(id, (tx) =>
    tx.select().from(findings).where(and(eq(findings.tenantId, id), eq(findings.runId, runId))),
  );
  const titel = new Map(katalog.anforderungen.map((a) => [a.id, a.titel]));
  const rows = zeilen
    .map((f) => ({ Anforderung: titel.get(f.anforderungId) ?? f.anforderungId, Status: f.status, Begründung: f.begruendung }))
    .sort((a, b) => a.Anforderung.localeCompare(b.Anforderung));
  const w = (k: "Anforderung" | "Status") => Math.max(k.length, ...rows.map((r) => r[k].length));
  const wa = w("Anforderung");
  const ws = w("Status");
  console.log(`${"Anforderung".padEnd(wa)} | ${"Status".padEnd(ws)} | Begründung`);
  console.log(`${"-".repeat(wa)}-+-${"-".repeat(ws)}-+-${"-".repeat(40)}`);
  for (const r of rows) console.log(`${r.Anforderung.padEnd(wa)} | ${r.Status.padEnd(ws)} | ${r.Begründung}`);
}

main(tenantId)
  .catch((e) => {
    console.error(e instanceof Error && !e.stack?.includes("runCollection") ? `Fehler: ${e.message}` : e);
    process.exitCode = 1;
  })
  .finally(closeDb);
