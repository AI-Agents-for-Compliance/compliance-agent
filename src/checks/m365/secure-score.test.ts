import { describe, expect, it } from "vitest";
import { secureScore } from "./secure-score";
import { liste, ok } from "../test-util";

const s = (currentScore: number, maxScore: number, createdDateTime = "2026-05-01T00:00:00Z") => ({ currentScore, maxScore, createdDateTime });
const run = (items: unknown[]) => secureScore.run({ "m365.secureScores": ok(liste(items), "s1") });

describe("M365-SECURE-SCORE", () => {
  it("genau 0,6 → erfuellt", () => expect(run([s(60, 100)]).status).toBe("erfuellt"));
  it("0,59 → teilweise", () => expect(run([s(59, 100)]).status).toBe("teilweise"));
  it("genau 0,4 → teilweise", () => expect(run([s(40, 100)]).status).toBe("teilweise"));
  it("0,39 → nicht_erfuellt", () => expect(run([s(39, 100)]).status).toBe("nicht_erfuellt"));
  it("nimmt den neuesten Eintrag, unabhängig von der Reihenfolge", () => {
    const r = run([s(10, 100, "2026-05-02T00:00:00Z"), s(90, 100, "2026-05-03T00:00:00Z"), s(20, 100, "2026-05-01T00:00:00Z")]);
    expect(r.status).toBe("erfuellt");
    expect(r.begruendung).toContain("90");
  });
  it("maxScore 0 → nicht_pruefbar", () =>
    expect(run([s(0, 0)])).toMatchObject({ status: "nicht_pruefbar", begruendung: "kein Secure Score verfügbar" }));
  it("keine Einträge → nicht_pruefbar", () => expect(run([]).begruendung).toBe("kein Secure Score verfügbar"));
});
