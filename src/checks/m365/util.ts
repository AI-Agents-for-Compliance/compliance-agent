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
  conditions?: {
    users?: {
      includeUsers?: string[]; excludeUsers?: string[]; excludeGroups?: string[]; excludeRoles?: string[];
      excludeGuestsOrExternalUsers?: unknown;
    };
    applications?: { includeApplications?: string[]; excludeApplications?: string[]; includeUserActions?: string[] };
    clientAppTypes?: string[];
    userRiskLevels?: string[];
    signInRiskLevels?: string[];
    locations?: { includeLocations?: string[]; excludeLocations?: string[] } | null;
    platforms?: { includePlatforms?: string[]; excludePlatforms?: string[] } | null;
    devices?: { deviceFilter?: unknown } | null;
  };
  grantControls?: { operator?: string; builtInControls?: string[]; authenticationStrength?: unknown } | null;
}

const MAX_AUSNAHMEKONTEN = 2;

/** Gründe, warum eine Richtlinie nicht für alle Benutzer/Anwendungen ohne relevante Ausnahmen gilt. */
function geltungsbereichProbleme(p: CaPolicy): string[] {
  const u = p.conditions?.users;
  const probleme: string[] = [];
  if (!u?.includeUsers?.includes("All")) probleme.push("gilt nur für ausgewählte Benutzer/Gruppen");
  if (!p.conditions?.applications?.includeApplications?.includes("All")) probleme.push("gilt nur für ausgewählte Anwendungen");
  const gr = (u?.excludeGroups?.length ?? 0) + (u?.excludeRoles?.length ?? 0);
  if (gr > 0) probleme.push(`${gr} ausgeschlossene Gruppen/Rollen`);
  const ex = u?.excludeUsers?.length ?? 0;
  if (ex > MAX_AUSNAHMEKONTEN) probleme.push(`${ex} ausgeschlossene Benutzer`);

  // Weitere Bedingungen schränken den Geltungsbereich ein; fail-safe: jede zählt als Einschränkung.
  const c = p.conditions;
  const a = c?.applications;
  if (u?.excludeGuestsOrExternalUsers != null) probleme.push("Gäste/externe Benutzer sind ausgeschlossen");
  if ((a?.excludeApplications?.length ?? 0) > 0) probleme.push(`${a!.excludeApplications!.length} ausgeschlossene Anwendungen`);
  if ((a?.includeUserActions?.length ?? 0) > 0) probleme.push("gilt für Benutzeraktionen statt für Anwendungen");
  if ((c?.userRiskLevels?.length ?? 0) > 0) probleme.push("gilt nur bei bestimmtem Benutzerrisiko");
  if ((c?.signInRiskLevels?.length ?? 0) > 0) probleme.push("gilt nur bei bestimmtem Anmelderisiko");
  const loc = c?.locations;
  if (loc && (!loc.includeLocations?.includes("All") || (loc.excludeLocations?.length ?? 0) > 0)) {
    probleme.push("gilt nur für bestimmte Standorte oder schließt Standorte aus");
  }
  const pf = c?.platforms;
  if (pf && (!pf.includePlatforms?.some((x) => x.toLowerCase() === "all") || (pf.excludePlatforms?.length ?? 0) > 0)) {
    probleme.push("gilt nur für bestimmte Geräteplattformen oder schließt Plattformen aus");
  }
  if (c?.devices?.deviceFilter != null) probleme.push("enthält einen Gerätefilter");
  return probleme;
}

/** MFA-Wirkung: undefined = Richtlinie nicht relevant; sonst Kontrollprobleme (MFA nur zwingend bei AND, einziger Control oder Authentication Strength). */
export function mfaWirkung(p: CaPolicy): string[] | undefined {
  const g = p.grantControls;
  if (!g) return undefined;
  const c = g.builtInControls ?? [];
  const stark = g.authenticationStrength != null;
  if (!stark && !c.includes("mfa")) return undefined;
  const probleme: string[] = [];
  if (!stark && g.operator !== "AND" && c.length !== 1) probleme.push("MFA ist nicht zwingend (Verknüpfung mit OR)");
  const apps = p.conditions?.clientAppTypes ?? [];
  const alleClients = apps.length === 0 || apps.includes("all")
    || (apps.includes("browser") && apps.includes("mobileAppsAndDesktopClients"));
  if (!alleClients) probleme.push("gilt nicht für alle Client-Apps");
  return probleme;
}

export interface Bewertung { status: Status; detail: string }

/** Bewertet Richtlinien mit passender Wirkung (`wirkt`) nach Geltungsbereich; beste Richtlinie zählt. Einzige Stelle dieser Logik. */
export function bewerteRichtlinien(policies: CaPolicy[], wirkung: (p: CaPolicy) => string[] | undefined): Bewertung | undefined {
  let teilweise: string | undefined;
  for (const p of policies) {
    const kontrollProbleme = wirkung(p);
    if (!kontrollProbleme) continue;
    if (p.state === "enabled") {
      const probleme = [...kontrollProbleme, ...geltungsbereichProbleme(p)];
      if (probleme.length === 0) {
        const ex = p.conditions?.users?.excludeUsers?.length ?? 0;
        return { status: "erfuellt", detail: ex > 0 ? `${ex} Ausnahmekonten (Notfallzugang)` : "" };
      }
      teilweise ??= probleme.join(", ");
    } else if (p.state === "enabledForReportingButNotEnforced") {
      teilweise ??= "nur im Berichtsmodus";
    }
  }
  return teilweise === undefined ? undefined : { status: "teilweise", detail: teilweise };
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
