import { describe, expect, it } from "vitest";
import { gaeste } from "./gaeste";
import { ok } from "../test-util";

const run = (id: string) => gaeste.run({ "m365.authorizationPolicy": ok({ guestUserRoleId: id }) }).status;

describe("M365-GAESTE", () => {
  it("eingeschränkteste Rolle → erfuellt", () => expect(run("2af84b1e-32c8-42b7-82bc-daa82404023b")).toBe("erfuellt"));
  it("eingeschränkte Rolle → teilweise", () => expect(run("10dae51f-b6af-4016-8d66-8c2a99b929b3")).toBe("teilweise"));
  it("Gast wie Mitglied → nicht_erfuellt", () => expect(run("a0b1b346-4d3e-4e8b-98f8-753987be4970")).toBe("nicht_erfuellt"));
  it("unbekannte Rolle → nicht_pruefbar", () => {
    const r = gaeste.run({ "m365.authorizationPolicy": ok({ guestUserRoleId: "zzz" }) });
    expect(r).toMatchObject({ status: "nicht_pruefbar", begruendung: "Gastrollen-ID unbekannt: zzz" });
  });
  it("fehlende Rolle → nicht_pruefbar", () => {
    expect(gaeste.run({ "m365.authorizationPolicy": ok({}) }).status).toBe("nicht_pruefbar");
  });
});
