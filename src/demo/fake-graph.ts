import type { GraphFetcher } from "../collectors/m365/graph";
import { ENDPOINTS } from "../collectors/m365/endpoints";

type Antwort = { status: number; body: unknown };

const TAG = 86_400_000;

/** Beispieldaten eines gemischten Tenants (kein echter Microsoft-Zugriff). Zeitbezogene Werte relativ zu `jetzt`. */
export function demoAntworten(jetzt: Date = new Date()): Map<string, Antwort> {
  const vorTagen = (n: number) => new Date(jetzt.getTime() - n * TAG).toISOString();
  const domain = "contoso.onmicrosoft.com";

  // 20 Mitglieder (14 mit MFA = 70 %), davon 3 Administratoren (einer ohne MFA).
  const registrierung = Array.from({ length: 20 }, (_, i) => ({
    userPrincipalName: `user${i}@${domain}`,
    isAdmin: i < 3,
    isMfaRegistered: i !== 2 && i < 15,
    userType: "member",
  }));
  const mfaAnzahl = registrierung.filter((r) => r.isMfaRegistered).length;
  if (mfaAnzahl !== 14) throw new Error(`Demo-Daten inkonsistent: ${mfaAnzahl} MFA-Registrierungen`);

  const geraete = Array.from({ length: 20 }, (_, i) => ({
    id: `dev-${i}`,
    operatingSystem: i < 16 ? "Windows" : "macOS",
    isEncrypted: i !== 0,
    complianceState: i < 15 ? "compliant" : "noncompliant",
  }));

  const benutzer = Array.from({ length: 30 }, (_, i) => ({
    id: `usr-${i}`,
    userPrincipalName: `user${i}@${domain}`,
    accountEnabled: true,
    userType: "member",
    signInActivity: { lastSignInDateTime: i < 3 ? vorTagen(200) : vorTagen(1 + (i % 20)) },
  }));

  const m = new Map<string, Antwort>();
  const setze = (key: string, a: Antwort) => {
    const ep = ENDPOINTS.find((e) => e.key === key);
    if (!ep) throw new Error(`Unbekannter Endpunkt: ${key}`);
    m.set(ep.path, a);
  };
  setze("m365.userRegistrationDetails", { status: 200, body: { value: registrierung } });
  setze("m365.globalAdmins", {
    status: 200,
    body: { value: ["alex", "sam", "kim"].map((n) => ({ id: n, userPrincipalName: `${n}@${domain}` })) },
  });
  setze("m365.conditionalAccessPolicies", {
    status: 403,
    body: {
      error: {
        code: "Authentication_RequestFromNonPremiumTenantOrB2CTenant",
        message: "Neither tenant is B2C or tenant doesn't have premium license (AadPremiumLicenseRequired).",
      },
    },
  });
  setze("m365.securityDefaults", { status: 200, body: { isEnabled: false } });
  setze("m365.authorizationPolicy", { status: 200, body: { guestUserRoleId: "10dae51f-b6af-4016-8d66-8c2a99b929b3" } });
  setze("m365.managedDevices", { status: 200, body: { value: geraete } });
  setze("m365.secureScores", {
    status: 200,
    body: { value: [{ currentScore: 52, maxScore: 100, createdDateTime: vorTagen(1) }] },
  });
  setze("m365.users", { status: 200, body: { value: benutzer } });
  return m;
}

/** Fake-GraphFetcher mit Beispieldaten; unbekannte Pfade liefern 404. */
export function createFakeGraphFetcher(jetzt?: Date): GraphFetcher {
  const antworten = demoAntworten(jetzt);
  return {
    async get(path) {
      const a = antworten.get(path);
      if (!a) return { status: 404, headers: new Headers(), body: { error: { code: "NotFound", message: path } } };
      return { status: a.status, headers: new Headers(), body: a.body };
    },
  };
}
