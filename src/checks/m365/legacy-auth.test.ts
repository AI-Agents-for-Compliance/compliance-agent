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
});
