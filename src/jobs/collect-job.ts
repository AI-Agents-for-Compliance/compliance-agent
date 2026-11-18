import { and, eq } from "drizzle-orm";
import type { Katalog } from "../catalog/schema";
import { evaluate } from "../checks/evaluate";
import type { Status } from "../checks/types";
import { ConsentRevokedError, collectM365 } from "../collectors/m365/collect";
import { TokenTransientError, type GraphFetcher } from "../collectors/m365/graph";
import { recordAudit } from "../db/audit";
import { collectionRuns, findings, m365Connections } from "../db/schema";
import { withTenant } from "../db/tenant";

export const COLLECT_JOB = "m365.collect";
export const COLLECT_ALL_JOB = "m365.collect-all";

export type CollectionErgebnis = "ok" | "getrennt" | "fehlgeschlagen";

export interface CollectionDeps {
  fetcherFor(msTenantId: string): GraphFetcher;
  katalog: Katalog;
  /** Nur für Tests: überbrückt Wartezeiten bei Drosselung. */
  sleep?: (ms: number) => Promise<void>;
}

const ACTOR = "system:sammler";

async function laufAbschliessen(
  tenantId: string,
  runId: string,
  ergebnis: CollectionErgebnis,
  extra: (tx: Parameters<Parameters<typeof withTenant>[1]>[0]) => Promise<void>,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    await extra(tx);
    await tx.update(collectionRuns).set({ finishedAt: new Date(), ergebnis }).where(eq(collectionRuns.id, runId));
  });
}

export async function runCollection(
  tenantId: string,
  deps: CollectionDeps,
): Promise<{ runId: string; ergebnis: CollectionErgebnis }> {
  // Verbindung laden und Lauf anlegen: eigene kleine Transaktion, damit der Lauf auch bei Rollback bestehen bleibt.
  const start = await withTenant(tenantId, async (tx) => {
    const [conn] = await tx
      .select()
      .from(m365Connections)
      .where(and(eq(m365Connections.tenantId, tenantId), eq(m365Connections.status, "aktiv")))
      .limit(1);
    if (!conn) return null;
    const [run] = await tx.insert(collectionRuns).values({ tenantId }).returning({ id: collectionRuns.id });
    return { conn, runId: run.id };
  });
  if (!start) throw new Error("keine aktive Microsoft-365-Verbindung für diesen Mandanten");
  const { conn, runId } = start;
  const fetcher = deps.fetcherFor(conn.msTenantId);

  try {
    // Snapshots, Befunde und Prüfpfad atomar: alles oder nichts.
    await withTenant(tenantId, async (tx) => {
      const bundle = await collectM365(tx, fetcher, deps.sleep);
      const ergebnisse = evaluate(deps.katalog, bundle);
      if (ergebnisse.length > 0) {
        await tx.insert(findings).values(
          ergebnisse.map((f) => ({
            tenantId,
            anforderungId: f.anforderungId,
            status: f.status,
            begruendung: f.begruendung,
            snapshotIds: f.snapshotIds,
            runId,
          })),
        );
      }
      const anzahl: Record<Status, number> = { erfuellt: 0, teilweise: 0, nicht_erfuellt: 0, nicht_pruefbar: 0 };
      for (const f of ergebnisse) anzahl[f.status]++;
      await tx.update(m365Connections).set({ lastCollectedAt: new Date() }).where(eq(m365Connections.id, conn.id));
      await recordAudit(tx, { actor: ACTOR, aktion: "sammlung_abgeschlossen", details: { runId, anzahl } });
      await tx.update(collectionRuns).set({ finishedAt: new Date(), ergebnis: "ok" }).where(eq(collectionRuns.id, runId));
    });
    return { runId, ergebnis: "ok" };
  } catch (e) {
    if (e instanceof ConsentRevokedError) {
      try {
        await laufAbschliessen(tenantId, runId, "getrennt", async (tx) => {
        await tx.update(m365Connections).set({ status: "getrennt" }).where(eq(m365Connections.id, conn.id));
        await recordAudit(tx, {
          actor: ACTOR,
          aktion: "verbindung_getrennt",
          details: { runId, code: e.name, meldung: e.message, ursache: e.cause instanceof Error ? e.cause.message : undefined },
        });
        });
      } catch (cleanupError) {
        console.error(`Abschluss des getrennten Laufs ${runId} nicht protokolliert:`, cleanupError);
        throw e;
      }
      return { runId, ergebnis: "getrennt" };
    }
    const transient = e instanceof TokenTransientError;
    try {
      await laufAbschliessen(tenantId, runId, "fehlgeschlagen", (tx) =>
        recordAudit(tx, {
          actor: ACTOR,
          aktion: "sammlung_fehlgeschlagen",
          details: { runId, code: e instanceof Error ? e.name : "Unbekannt", meldung: e instanceof Error ? e.message : String(e) },
        }),
      );
    } catch (cleanupError) {
      console.error(`Abschluss des fehlgeschlagenen Laufs ${runId} nicht protokolliert:`, cleanupError);
      throw e;
    }
    if (transient) return { runId, ergebnis: "fehlgeschlagen" };
    throw e;
  }
}

/** pg-boss-Handler: wirft bei "fehlgeschlagen", damit pg-boss den Job wiederholt. */
export async function collectJobHandler(tenantId: string, deps: CollectionDeps): Promise<void> {
  const r = await runCollection(tenantId, deps);
  if (r.ergebnis === "fehlgeschlagen") {
    throw new Error(`Sammlung für Mandant ${tenantId} fehlgeschlagen (Lauf ${r.runId}), Wiederholung folgt`);
  }
}
