import { sql } from "drizzle-orm";
import type { Tx } from "./client";
import { auditEvents } from "./schema";

export async function recordAudit(
  tx: Tx,
  e: { actor: string; aktion: string; details?: object },
): Promise<void> {
  await tx.insert(auditEvents).values({
    // tenant_id aus dem Transaktionskontext; die RLS-Policy erzwingt die Uebereinstimmung.
    tenantId: sql`NULLIF(current_setting('app.tenant_id', true), '')::uuid`,
    actor: e.actor,
    aktion: e.aktion,
    details: e.details ?? null,
  });
}
