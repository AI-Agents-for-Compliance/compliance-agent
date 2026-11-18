import { describe, expect, it } from "vitest";
import { legacyAuth } from "./legacy-auth";
import { caPolicy, item, liste, ok } from "../test-util";

const legacy = (state?: "enabled" | "disabled" | "enabledForReportingButNotEnforced") =>
  caPolicy({ state, clientAppTypes: ["exchangeActiveSync", "other"], builtInControls: ["block"] });
const run = (isEnabled: boolean, policies: unknown[]) =>
  legacyAuth.run({ "m365.securityDefaults": ok({ isEnabled }, "sd"), "m365.conditionalAccessPolicies": ok(liste(policies), "ca") });

describe("M365-LEGACY-AUTH", () => {
  it("Security Defaults aktiv → erfuellt", () => expect(run(true, []).status).toBe("erfuellt"));
  it("Security Defaults aktiv, CA nicht lizenziert → erfuellt", () => {
    const r = legacyAuth.run({ "m365.securityDefaults": ok({ isEnabled: true }), "m365.conditionalAccessPolicies": item("not_licensed") });
    expect(r.status).toBe("erfuellt");
  });
  it("Defaults aus, CA nicht lizenziert → nicht_pruefbar", () => {
    const r = legacyAuth.run({ "m365.securityDefaults": ok({ isEnabled: false }), "m365.conditionalAccessPolicies": item("not_licensed") });
    expect(r).toMatchObject({ status: "nicht_pruefbar", begruendung: "Lizenz fehlt: m365.conditionalAccessPolicies" });
  });
  it("aktive Blockierungs-Richtlinie → erfuellt", () => expect(run(false, [legacy()]).status).toBe("erfuellt"));
  it("Richtlinie nur im Berichtsmodus → teilweise", () =>
    expect(run(false, [legacy("enabledForReportingButNotEnforced")]).status).toBe("teilweise"));
  it("deaktivierte Richtlinie → nicht_erfuellt", () => expect(run(false, [legacy("disabled")]).status).toBe("nicht_erfuellt"));
  it("blockiert nur exchangeActiveSync → nicht_erfuellt", () =>
    expect(run(false, [caPolicy({ clientAppTypes: ["exchangeActiveSync"], builtInControls: ["block"] })]).status).toBe("nicht_erfuellt"));
  it("MFA statt Block → nicht_erfuellt", () =>
    expect(run(false, [caPolicy({ clientAppTypes: ["exchangeActiveSync", "other"], builtInControls: ["mfa"] })]).status).toBe("nicht_erfuellt"));
  it("keine Richtlinien → nicht_erfuellt", () => expect(run(false, []).status).toBe("nicht_erfuellt"));
  it("Pilotgruppe → teilweise", () => {
    const r = run(false, [caPolicy({ includeUsers: ["pilot-group"], clientAppTypes: ["exchangeActiveSync", "other"], builtInControls: ["block"] })]);
    expect(r.status).toBe("teilweise");
    expect(r.begruendung).toContain("ausgewählte Benutzer/Gruppen");
  });
  it("excludeGroups → teilweise", () =>
    expect(run(false, [caPolicy({ excludeGroups: ["g"], clientAppTypes: ["exchangeActiveSync", "other"], builtInControls: ["block"] })]).status).toBe("teilweise"));
  it("3 ausgeschlossene Benutzer → teilweise, 2 → erfuellt", () => {
    const base = { clientAppTypes: ["exchangeActiveSync", "other"], builtInControls: ["block"] };
    expect(run(false, [caPolicy({ ...base, excludeUsers: ["a", "b", "c"] })]).status).toBe("teilweise");
    expect(run(false, [caPolicy({ ...base, excludeUsers: ["a", "b"] })]).status).toBe("erfuellt");
  });
  it("nur eine Anwendung → teilweise", () =>
    expect(run(false, [caPolicy({ applications: ["app-1"], clientAppTypes: ["exchangeActiveSync", "other"], builtInControls: ["block"] })]).status).toBe("teilweise"));
});

const bedingungen: Array<[string, Parameters<typeof caPolicy>[0], string]> = [
  ["Benutzerrisiko", { condExtra: { userRiskLevels: ["high"] } }, "Benutzerrisiko"],
  ["Anmelderisiko", { condExtra: { signInRiskLevels: ["medium", "high"] } }, "Anmelderisiko"],
  ["Standorte ausgeschlossen", { condExtra: { locations: { includeLocations: ["All"], excludeLocations: ["AllTrusted"] } } }, "Standort"],
  ["Standorte eingeschränkt", { condExtra: { locations: { includeLocations: ["loc-1"] } } }, "Standort"],
  ["Plattformen eingeschränkt", { condExtra: { platforms: { includePlatforms: ["android"] } } }, "Plattform"],
  ["Plattformen ausgeschlossen", { condExtra: { platforms: { includePlatforms: ["all"], excludePlatforms: ["iOS"] } } }, "Plattform"],
  ["ausgeschlossene Anwendungen", { appsExtra: { excludeApplications: ["app-x"] } }, "ausgeschlossene Anwendungen"],
  ["Gerätefilter", { condExtra: { devices: { deviceFilter: { mode: "exclude", rule: "x" } } } }, "Gerätefilter"],
  ["Gäste ausgeschlossen", { usersExtra: { excludeGuestsOrExternalUsers: { guestOrExternalUserTypes: "b2bCollaborationGuest" } } }, "Gäste"],
  ["Benutzeraktionen", { appsExtra: { includeUserActions: ["urn:user:registersecurityinfo"] } }, "Benutzeraktionen"],
];

describe("Geltungsbereich: weitere Bedingungen (fail-safe)", () => {
  it.each(bedingungen)("%s → teilweise mit Begründung", (_n, o, text) => {
    const r = run(false, [caPolicy({ clientAppTypes: ["exchangeActiveSync", "other"], builtInControls: ["block"], ...o })]);
    expect(r.status).toBe("teilweise");
    expect(r.begruendung).toContain(text);
  });
  it("Mischfall: breite Richtlinie mit weiterer Bedingung und schmale ohne Bedingung → teilweise", () => {
    const base = { clientAppTypes: ["exchangeActiveSync", "other"], builtInControls: ["block"] };
    const r = run(false, [
      caPolicy({ ...base, condExtra: { locations: { includeLocations: ["All"], excludeLocations: ["AllTrusted"] } } }),
      caPolicy({ ...base, includeUsers: ["pilot"] }),
    ]);
    expect(r.status).toBe("teilweise");
  });
});
