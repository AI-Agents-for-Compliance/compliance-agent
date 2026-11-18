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

// --- Builder für Graph-v1.0-Antwortformen (Listen als { value: [...] }) ---

export const liste = (value: unknown[]) => ({ value });

export interface Reg { userPrincipalName: string; isAdmin: boolean; isMfaRegistered: boolean; userType: string }

export function reg(name: string, o: Partial<Reg> = {}): Reg {
  return { userPrincipalName: `${name}@contoso.onmicrosoft.com`, isAdmin: false, isMfaRegistered: true, userType: "member", ...o };
}

/** `mitMfa` von `gesamt` Mitgliedern sind MFA-registriert. */
export function regMitQuote(mitMfa: number, gesamt: number) {
  return liste(Array.from({ length: gesamt }, (_, i) => reg(`u${i}`, { isMfaRegistered: i < mitMfa })));
}

/** Anteil `n` von `gesamt` Elementen erfüllt `wahr`, Rest `falsch`. */
export function anteil<T>(n: number, gesamt: number, wahr: (i: number) => T, falsch: (i: number) => T): T[] {
  return Array.from({ length: gesamt }, (_, i) => (i < n ? wahr(i) : falsch(i)));
}

export function caPolicy(o: {
  state?: "enabled" | "disabled" | "enabledForReportingButNotEnforced";
  includeUsers?: string[];
  excludeUsers?: string[];
  excludeGroups?: string[];
  excludeRoles?: string[];
  applications?: string[];
  clientAppTypes?: string[];
  builtInControls?: string[];
  operator?: "AND" | "OR";
  authenticationStrength?: unknown;
  /** Zusätzliche Bedingungen (überschreiben/ergänzen die jeweiligen Abschnitte). */
  usersExtra?: Record<string, unknown>;
  appsExtra?: Record<string, unknown>;
  condExtra?: Record<string, unknown>;
} = {}) {
  return {
    displayName: "Policy",
    state: o.state ?? "enabled",
    conditions: {
      users: {
        includeUsers: o.includeUsers ?? ["All"],
        excludeUsers: o.excludeUsers ?? [],
        excludeGroups: o.excludeGroups ?? [],
        excludeRoles: o.excludeRoles ?? [],
        ...o.usersExtra,
      },
      applications: { includeApplications: o.applications ?? ["All"], ...o.appsExtra },
      clientAppTypes: o.clientAppTypes ?? ["all"],
      ...o.condExtra,
    },
    grantControls: {
      operator: o.operator ?? "OR",
      builtInControls: o.builtInControls ?? ["mfa"],
      authenticationStrength: o.authenticationStrength ?? null,
    },
  };
}
