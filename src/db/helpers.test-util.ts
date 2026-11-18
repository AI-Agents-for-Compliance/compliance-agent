import { sql } from "drizzle-orm";
import postgres from "postgres";
import { TEST_DATABASE_URL } from "./test-setup";

/** Leert alle Tabellen als Eigentuemer (umgeht RLS und Trigger) und legt zwei Mandanten an. */
export async function resetTenants(a: string, b: string): Promise<void> {
  const owner = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    await owner.unsafe(
      "TRUNCATE tenants, m365_connections, evidence_snapshots, findings, collection_runs, audit_events CASCADE",
    );
    await owner`INSERT INTO tenants (id, name) VALUES (${a}, 'A'), (${b}, 'B')`;
  } finally {
    await owner.end();
  }
}
export { sql };

/** Drizzle verpackt Postgres-Fehler ("Failed query ..."); die eigentliche Meldung steht in cause. */
export async function fehlermeldung(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    const parts: string[] = [];
    for (let c: unknown = e; c instanceof Error; c = c.cause) parts.push(c.message);
    return parts.join(" | ");
  }
  throw new Error("Erwarteter Fehler blieb aus");
}
