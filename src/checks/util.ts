import type { EvidenceBundle, EvidenceItem, EvidenceKey } from "../evidence/types";
import type { CheckResult } from "./types";

/** Einzige Stelle für die Abbildung Nachweis-Status → Begründung bei nicht verfügbaren Nachweisen. */
export function nachweisMangel(key: EvidenceKey, item: EvidenceItem | undefined): string | undefined {
  if (item?.status === "ok") return undefined;
  if (item?.status === "not_licensed") return `Lizenz fehlt: ${key}`;
  if (item?.status === "permission_denied") return `Berechtigung fehlt: ${key}`;
  return `Nachweis nicht verfügbar: ${key}`;
}

/** Begründung für den ersten fehlenden/nicht-ok Nachweis in der Reihenfolge von `keys`. */
export function ersterMangel(keys: EvidenceKey[], e: EvidenceBundle): string | undefined {
  for (const key of keys) {
    const m = nachweisMangel(key, e[key]);
    if (m) return m;
  }
  return undefined;
}

/** snapshotIds aller vorhandenen Nachweise unter `keys`. */
export function snapshotIdsOf(e: EvidenceBundle, keys: EvidenceKey[]): string[] {
  return keys.flatMap((k) => (e[k] ? [e[k].snapshotId] : []));
}

export function nichtPruefbar(e: EvidenceBundle, keys: EvidenceKey[], begruendung: string): CheckResult {
  return { status: "nicht_pruefbar", begruendung, snapshotIds: snapshotIdsOf(e, keys) };
}

/** Graph-Listenantwort `{ value: [...] }` → Array (tolerant gegenüber fehlerhaften Formen). */
export function listeAus<T>(data: unknown): T[] {
  const v = (data as { value?: unknown } | null | undefined)?.value;
  return Array.isArray(v) ? (v as T[]) : [];
}

export function namenListe(namen: string[], max = 10): string {
  if (namen.length <= max) return namen.join(", ");
  return `${namen.slice(0, max).join(", ")} und ${namen.length - max} weitere`;
}

/** 0.95 → "95 %", 0.333 → "33,3 %". */
export function prozent(anteil: number): string {
  const p = Math.round(anteil * 1000) / 10;
  return `${String(p).replace(".", ",")} %`;
}
