import type { Katalog } from "../catalog/schema";
import type { Finding, Status } from "../checks/types";

export interface Reifegrad {
  bereich: number;
  titel: string;
  prozent: number | null;
  anzahl: Record<Status, number>;
}

const PUNKTE: Record<Status, number | null> = {
  erfuellt: 1,
  teilweise: 0.5,
  nicht_erfuellt: 0,
  nicht_pruefbar: null, // zählt nicht
};

/**
 * Reifegrad je Maßnahmenbereich (1–10): gewichteter Mittelwert der Punkte
 * (erfüllt 1, teilweise 0,5, nicht erfüllt 0) über alle bewertbaren Befunde;
 * `nicht_pruefbar` zählt weder im Zähler noch im Nenner. Ohne bewertbare Befunde: null.
 */
export function reifegrad(katalog: Katalog, findings: Finding[]): Reifegrad[] {
  const nachId = new Map(katalog.anforderungen.map((a) => [a.id, a]));
  return Array.from({ length: 10 }, (_, i) => {
    const nr = i + 1;
    const anzahl: Record<Status, number> = { erfuellt: 0, teilweise: 0, nicht_erfuellt: 0, nicht_pruefbar: 0 };
    let punkte = 0;
    let gewicht = 0;
    for (const f of findings) {
      const a = nachId.get(f.anforderungId);
      if (!a || a.bereich !== nr) continue;
      anzahl[f.status]++;
      const p = PUNKTE[f.status];
      if (p === null) continue;
      punkte += p * a.gewicht;
      gewicht += a.gewicht;
    }
    return {
      bereich: nr,
      titel: katalog.bereiche.find((b) => b.nr === nr)?.titel ?? `Bereich ${nr}`,
      prozent: gewicht === 0 ? null : Math.round((punkte / gewicht) * 100),
      anzahl,
    };
  });
}
