import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import type { Tx } from "../db/client";
import { evidenceSnapshots } from "../db/schema";
import type { EvidenceItem, EvidenceKey, EvidenceStatus } from "./types";

/** Kanonische Form: Objektschlüssel rekursiv sortiert, Arrays behalten ihre Reihenfolge. */
function canonicalize(v: unknown): unknown {
  // toJSON zuerst anwenden (z. B. Date), wie JSON.stringify - sonst weicht der Hash vom gespeicherten jsonb ab.
  if (v !== null && typeof v === "object" && typeof (v as { toJSON?: unknown }).toJSON === "function") {
    v = (v as { toJSON: () => unknown }).toJSON();
  }
  if (Array.isArray(v)) return v.map(canonicalize);
  if (v !== null && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(o)
        .sort()
        .map((k) => [k, canonicalize(o[k])]),
    );
  }
  return v;
}

/** SHA-256 (hex) über kanonisches JSON; undefined-Werte in Objekten entfallen wie bei JSON.stringify. */
export function canonicalHash(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(payload)) ?? "null")
    .digest("hex");
}

/** Jeder Aufruf legt einen neuen Snapshot an (keine Deduplizierung); tenant_id kommt aus dem Transaktionskontext. */
export async function storeSnapshot(
  tx: Tx,
  s: { key: EvidenceKey; status: EvidenceStatus; payload: unknown; source: "m365" },
): Promise<EvidenceItem> {
  if (s.payload === undefined || s.payload === null) throw new Error("Nachweis-Payload darf nicht leer sein");
  const [row] = await tx
    .insert(evidenceSnapshots)
    .values({
      tenantId: sql`NULLIF(current_setting('app.tenant_id', true), '')::uuid`,
      source: s.source,
      key: s.key,
      status: s.status,
      payload: s.payload,
      sha256: canonicalHash(s.payload),
    })
    .returning();
  return { snapshotId: row.id, status: s.status, data: row.payload, collectedAt: row.collectedAt };
}
