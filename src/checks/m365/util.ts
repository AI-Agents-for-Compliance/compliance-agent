import type { EvidenceBundle, EvidenceKey } from "../../evidence/types";
import type { CheckResult, Status } from "../types";
import { nachweisMangel, nichtPruefbar, snapshotIdsOf } from "../util";

export interface Stufen { erfuelltAb: number; teilweiseAb: number }

/** Höher-ist-besser-Bewertung; Untergrenzen inklusive. */
export function stufe(anteil: number, s: Stufen): Status {
  if (anteil >= s.erfuelltAb) return "erfuellt";
  if (anteil >= s.teilweiseAb) return "teilweise";
  return "nicht_erfuellt";
}

export function ergebnis(e: EvidenceBundle, keys: EvidenceKey[], status: Status, begruendung: string): CheckResult {
  return { status, begruendung, snapshotIds: snapshotIdsOf(e, keys) };
}

export interface CaPolicy {
  state?: string;
  conditions?: { users?: { includeUsers?: string[] }; clientAppTypes?: string[] };
  grantControls?: { operator?: string; builtInControls?: string[] } | null;
}

export type CaZugriff = { policies: CaPolicy[] } | { result: CheckResult };

/** Security Defaults + Conditional Access (Letzteres optional): gemeinsame Vorlogik von MFA-ERZWUNGEN und LEGACY-AUTH. */
export const SD_CA_KEYS: EvidenceKey[] = ["m365.securityDefaults", "m365.conditionalAccessPolicies"];

export function securityDefaultsAktiv(e: EvidenceBundle): boolean {
  return (e["m365.securityDefaults"]?.data as { isEnabled?: boolean } | undefined)?.isEnabled === true;
}

export function caRichtlinien(e: EvidenceBundle): CaZugriff {
  const ca = e["m365.conditionalAccessPolicies"];
  const mangel = nachweisMangel("m365.conditionalAccessPolicies", ca);
  if (mangel) return { result: nichtPruefbar(e, SD_CA_KEYS, mangel) };
  const v = (ca!.data as { value?: unknown } | null)?.value;
  return { policies: Array.isArray(v) ? (v as CaPolicy[]) : [] };
}
