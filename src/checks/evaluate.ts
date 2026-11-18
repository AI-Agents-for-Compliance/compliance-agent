import type { Katalog } from "../catalog/schema";
import type { EvidenceBundle } from "../evidence/types";
import { registry } from "./registry";
import type { Check, Finding } from "./types";
import { ersterMangel, nichtPruefbar } from "./util";

export function evaluate(
  katalog: Katalog,
  evidence: EvidenceBundle,
  checks: ReadonlyMap<string, Check> = registry,
): Finding[] {
  const findings: Finding[] = [];
  for (const a of katalog.anforderungen) {
    if (a.nachweisart !== "automatisch") continue;
    const check = a.pruefung ? checks.get(a.pruefung) : undefined;
    if (!check) {
      findings.push({
        anforderungId: a.id,
        status: "nicht_pruefbar",
        begruendung: `Keine Prüfung hinterlegt: ${a.pruefung ?? "(keine)"}`,
        snapshotIds: [],
      });
      continue;
    }
    const mangel = ersterMangel(check.benoetigt, evidence);
    const result = mangel
      ? nichtPruefbar(evidence, check.benoetigt, mangel)
      : check.run(evidence);
    findings.push({ anforderungId: a.id, ...result });
  }
  return findings;
}
