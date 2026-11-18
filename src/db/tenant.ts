import { sql } from "drizzle-orm";
import { getDb, type Tx } from "./client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fuehrt fn in einer Transaktion fuer genau einen Mandanten aus.
 * Die Verbindung gehoert dem Migrationsnutzer (Eigentuemer/Superuser, umgeht RLS);
 * deshalb wechselt die Transaktion per SET LOCAL ROLE auf app_user (NOBYPASSRLS),
 * und app.tenant_id wird transaktionslokal gesetzt. Beides endet mit COMMIT/ROLLBACK.
 */
export async function withTenant<T>(tenantId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (!UUID.test(tenantId)) throw new Error("Ungültige Mandanten-ID");
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE app_user`);
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    return fn(tx);
  });
}
