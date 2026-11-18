import type { EvidenceBundle, EvidenceKey } from "../evidence/types";

export type Status = "erfuellt" | "teilweise" | "nicht_erfuellt" | "nicht_pruefbar";

export interface CheckResult {
  status: Status;
  begruendung: string;
  snapshotIds: string[];
}

export interface Check {
  id: string;
  /** Pflicht-Nachweise: fehlen sie oder sind nicht `ok`, setzt `evaluate` nicht_pruefbar. */
  benoetigt: EvidenceKey[];
  /** Optionale Nachweise: werden unverändert an `run` übergeben, die Prüfung behandelt sie selbst. */
  optional?: EvidenceKey[];
  run(e: EvidenceBundle): CheckResult;
}

export interface Finding extends CheckResult {
  anforderungId: string;
}
