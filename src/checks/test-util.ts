import type { EvidenceItem, EvidenceStatus } from "../evidence/types";
import type { Anforderung, Katalog } from "../catalog/schema";

let zaehler = 0;

export function item(status: EvidenceStatus, data: unknown = null, snapshotId?: string): EvidenceItem {
  return { snapshotId: snapshotId ?? `snap-${++zaehler}`, status, data, collectedAt: new Date("2026-01-01T00:00:00Z") };
}

export const ok = (data: unknown, snapshotId?: string) => item("ok", data, snapshotId);

export function katalogMit(...a: Array<Partial<Anforderung> & { id?: string }>): Katalog {
  return {
    version: "test",
    bereiche: [],
    anforderungen: a.map((x, i) => ({
      id: `T-${i}`,
      bereich: 10,
      titel: "t",
      beschreibung: "b",
      rechtsgrundlage: "r",
      nachweisart: "automatisch",
      pruefung: x.id ?? x.pruefung,
      gewicht: 1,
      ...x,
    })) as Anforderung[],
  };
}
