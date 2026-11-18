import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate";
import type { Check } from "./types";
import { item, katalogMit, ok } from "./test-util";

const fake: Check = {
  id: "FAKE",
  benoetigt: ["m365.userRegistrationDetails", "m365.securityDefaults"],
  optional: ["m365.conditionalAccessPolicies"],
  run: (e) => ({ status: "erfuellt", begruendung: "ok", snapshotIds: [e["m365.userRegistrationDetails"]!.snapshotId] }),
};
const checks = new Map([[fake.id, fake]]);
const kat = katalogMit({ id: "A1", pruefung: "FAKE" });

describe("evaluate", () => {
  it("fehlender Nachweis → nicht_pruefbar", () => {
    const [f] = evaluate(kat, {}, checks);
    expect(f).toMatchObject({ anforderungId: "A1", status: "nicht_pruefbar", begruendung: "Nachweis nicht verfügbar: m365.userRegistrationDetails" });
    expect(f.snapshotIds).toEqual([]);
  });
  it("fehlende Lizenz → nicht_pruefbar", () => {
    const [f] = evaluate(kat, { "m365.userRegistrationDetails": item("not_licensed", null, "s1"), "m365.securityDefaults": ok({}, "s2") }, checks);
    expect(f).toMatchObject({ status: "nicht_pruefbar", begruendung: "Lizenz fehlt: m365.userRegistrationDetails", snapshotIds: ["s1", "s2"] });
  });
  it("fehlende Berechtigung → nicht_pruefbar", () => {
    const [f] = evaluate(kat, { "m365.userRegistrationDetails": ok([]), "m365.securityDefaults": item("permission_denied") }, checks);
    expect(f.begruendung).toBe("Berechtigung fehlt: m365.securityDefaults");
  });
  it("Fehlerstatus → nicht verfügbar", () => {
    const [f] = evaluate(kat, { "m365.userRegistrationDetails": item("error"), "m365.securityDefaults": ok({}) }, checks);
    expect(f.begruendung).toBe("Nachweis nicht verfügbar: m365.userRegistrationDetails");
  });
  it("optionaler Nachweis nicht ok blockiert nicht", () => {
    const [f] = evaluate(kat, {
      "m365.userRegistrationDetails": ok([], "s1"),
      "m365.securityDefaults": ok({}),
      "m365.conditionalAccessPolicies": item("not_licensed"),
    }, checks);
    expect(f).toMatchObject({ status: "erfuellt", snapshotIds: ["s1"] });
  });
  it("ignoriert Anforderungen ohne automatische Prüfung", () =>
    expect(evaluate(katalogMit({ nachweisart: "dokument", pruefung: undefined }), {}, checks)).toEqual([]));
  it("nicht registrierte Prüfung → nicht_pruefbar", () => {
    const [f] = evaluate(katalogMit({ pruefung: "GIBT-ES-NICHT" }), {}, checks);
    expect(f.status).toBe("nicht_pruefbar");
  });
});
