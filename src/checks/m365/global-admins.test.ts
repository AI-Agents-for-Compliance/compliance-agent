import { describe, expect, it } from "vitest";
import { globalAdmins } from "./global-admins";
import { liste, ok } from "../test-util";

const run = (n: number) =>
  globalAdmins.run({ "m365.globalAdmins": ok(liste(Array.from({ length: n }, (_, i) => ({ userPrincipalName: `a${i}@x.de` }))), "s1") });

describe("M365-GLOBAL-ADMINS", () => {
  it.each([2, 3, 4])("%i Admins → erfuellt", (n) => expect(run(n).status).toBe("erfuellt"));
  it("1 Admin → nicht_erfuellt mit Anzahl", () => {
    const r = run(1);
    expect(r.status).toBe("nicht_erfuellt");
    expect(r.begruendung).toContain("1");
  });
  it("0 Admins → nicht_pruefbar", () =>
    expect(run(0)).toMatchObject({ status: "nicht_pruefbar", begruendung: "keine globalen Administratoren gefunden" }));
  it("5 Admins → nicht_erfuellt mit Anzahl", () => {
    const r = run(5);
    expect(r.status).toBe("nicht_erfuellt");
    expect(r.begruendung).toContain("5");
    expect(r.snapshotIds).toEqual(["s1"]);
  });
});
