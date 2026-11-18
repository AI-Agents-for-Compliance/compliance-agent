import { desc, eq, inArray, isNotNull, and } from "drizzle-orm";
import { loadCatalog } from "../catalog/load";
import type { Katalog } from "../catalog/schema";
import { registry } from "../checks/registry";
import type { Finding, Status } from "../checks/types";
import { collectionRuns, evidenceSnapshots, findings, m365Connections } from "../db/schema";
import { withTenant } from "../db/tenant";
import { reifegrad, type Reifegrad } from "./maturity";

export type Verbindung = "verbunden" | "getrennt" | "nicht_verbunden";

export interface BefundZeile {
  anforderungId: string;
  titel: string;
  status: Status;
  begruendung: string;
  /** Erhebungszeitpunkt des ersten Snapshots des Befunds, sonst null. */
  snapshotAm: Date | null;
}

export interface LetzterLauf {
  startedAt: Date;
  finishedAt: Date | null;
  ergebnis: string | null;
}

export interface DashboardDaten {
  verbindung: Verbindung;
  letzteSammlung: Date | null;
  /** Letzter Lauf beliebigen Ergebnisses (zeigt z. B. "fehlgeschlagen"/"getrennt"). */
  letzterLauf: LetzterLauf | null;
  /** Zeitpunkt des Laufs, aus dem die Befunde stammen (letzter Lauf mit ergebnis "ok"). */
  befundeStand: Date | null;
  reifegrad: Reifegrad[];
  befunde: BefundZeile[];
}

let katalogCache: Katalog | undefined;
function katalog(): Katalog {
  katalogCache ??= loadCatalog("catalog", new Set(registry.keys()));
  return katalogCache;
}

export async function ladeDashboard(tenantId: string): Promise<DashboardDaten> {
  const kat = katalog();
  const titel = new Map(kat.anforderungen.map((a) => [a.id, a.titel]));

  const roh = await withTenant(tenantId, async (tx) => {
    const [conn] = await tx.select().from(m365Connections).where(eq(m365Connections.tenantId, tenantId)).limit(1);
    const [letzter] = await tx.select().from(collectionRuns)
      .where(eq(collectionRuns.tenantId, tenantId))
      .orderBy(desc(collectionRuns.startedAt)).limit(1);
    const [okLauf] = await tx.select().from(collectionRuns)
      .where(and(eq(collectionRuns.tenantId, tenantId), eq(collectionRuns.ergebnis, "ok"), isNotNull(collectionRuns.finishedAt)))
      .orderBy(desc(collectionRuns.finishedAt)).limit(1);
    const fs = okLauf
      ? await tx.select().from(findings).where(and(eq(findings.tenantId, tenantId), eq(findings.runId, okLauf.id)))
      : [];
    const snapIds = [...new Set(fs.map((f) => f.snapshotIds[0]).filter((x): x is string => !!x))];
    const snaps = snapIds.length
      ? await tx.select({ id: evidenceSnapshots.id, at: evidenceSnapshots.collectedAt }).from(evidenceSnapshots)
          .where(and(eq(evidenceSnapshots.tenantId, tenantId), inArray(evidenceSnapshots.id, snapIds)))
      : [];
    return { conn, letzter, okLauf, fs, snaps };
  });

  const snapAm = new Map(roh.snaps.map((s) => [s.id, s.at]));
  const fs = [...roh.fs].sort((a, b) => a.anforderungId.localeCompare(b.anforderungId));
  const befunde: BefundZeile[] = fs.map((f) => ({
    anforderungId: f.anforderungId,
    titel: titel.get(f.anforderungId) ?? f.anforderungId,
    status: f.status as Status,
    begruendung: f.begruendung,
    snapshotAm: (f.snapshotIds[0] && snapAm.get(f.snapshotIds[0])) || null,
  }));
  const befundModell: Finding[] = fs.map((f) => ({
    anforderungId: f.anforderungId,
    status: f.status as Status,
    begruendung: f.begruendung,
    snapshotIds: f.snapshotIds,
  }));

  return {
    verbindung: !roh.conn ? "nicht_verbunden" : roh.conn.status === "aktiv" ? "verbunden" : "getrennt",
    letzteSammlung: roh.conn?.lastCollectedAt ?? null,
    letzterLauf: roh.letzter
      ? { startedAt: roh.letzter.startedAt, finishedAt: roh.letzter.finishedAt, ergebnis: roh.letzter.ergebnis }
      : null,
    befundeStand: roh.okLauf?.finishedAt ?? null,
    reifegrad: reifegrad(kat, befundModell),
    befunde,
  };
}
