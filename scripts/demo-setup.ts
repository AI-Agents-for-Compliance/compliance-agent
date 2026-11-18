import { closeDb, DEFAULT_DATABASE_URL, getDb } from "../src/db/client";
import { m365Connections, tenants } from "../src/db/schema";
import { withTenant } from "../src/db/tenant";
import { datenbankHost, pruefeLokaleDatenbank } from "../src/demo/guard";

const args = process.argv.slice(2);
const fake = args.includes("--fake");
const name = args.find((a) => !a.startsWith("--")) ?? "Demo GmbH";

async function main() {
  if (fake) pruefeLokaleDatenbank();
  console.log(`Zieldatenbank: ${datenbankHost(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL)}`);
  // Eigentümer-Verbindung (RLS gilt nur für app_user): Mandant anlegen.
  const [t] = await getDb().insert(tenants).values({ name }).returning({ id: tenants.id });
  if (fake) {
    await withTenant(t.id, (tx) =>
      tx.insert(m365Connections).values({
        tenantId: t.id,
        msTenantId: "00000000-0000-4000-8000-000000000000",
        status: "aktiv",
      }),
    );
  }
  const app = process.env.APP_URL ?? "http://localhost:3000";
  console.log(`Mandant "${name}" angelegt.`);
  console.log(`Tenant-UUID: ${t.id}`);
  console.log(`Dashboard:   ${app}/dashboard?tenant=${t.id}`);
  if (!fake) console.log(`Verbinden:   siehe docs/entwicklung.md (Abschnitt "Verbindung herstellen")`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? `Fehler: ${e.message}` : e);
    process.exitCode = 1;
  })
  .finally(closeDb);
