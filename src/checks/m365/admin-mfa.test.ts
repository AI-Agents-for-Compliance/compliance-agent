import { describe, expect, it } from "vitest";
import { adminMfa } from "./admin-mfa";
import { liste, ok, reg } from "../test-util";

const run = (v: unknown[]) => adminMfa.run({ "m365.userRegistrationDetails": ok(liste(v), "s1") });

describe("M365-ADMIN-MFA", () => {
  it("alle Admins mit MFA → erfuellt", () => {
    const r = run([reg("admin1", { isAdmin: true }), reg("user1", { isMfaRegistered: false })]);
    expect(r).toMatchObject({ status: "erfuellt", snapshotIds: ["s1"] });
    expect(r.begruendung).toContain("1");
  });
  it("Admin ohne MFA → nicht_erfuellt mit Namen", () => {
    const r = run([reg("admin1", { isAdmin: true }), reg("admin2", { isAdmin: true, isMfaRegistered: false })]);
    expect(r.status).toBe("nicht_erfuellt");
    expect(r.begruendung).toContain("admin2@contoso.onmicrosoft.com");
    expect(r.begruendung).not.toContain("admin1@");
  });
  it("kürzt Namensliste bei 10", () => {
    const r = run(Array.from({ length: 12 }, (_, i) => reg(`a${i}`, { isAdmin: true, isMfaRegistered: false })));
    expect(r.begruendung).toContain("und 2 weitere");
  });
  it("keine Administratoren → nicht_pruefbar", () => {
    expect(run([reg("user1")]).status).toBe("nicht_pruefbar");
  });
});
