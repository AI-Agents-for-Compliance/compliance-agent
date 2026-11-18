import { describe, expect, it } from "vitest";
import { reifegrad } from "./maturity";
import type { Anforderung, Katalog } from "../catalog/schema";
import type { Finding, Status } from "../checks/types";

function kat(a: Array<Partial<Anforderung> & { id: string; bereich: Anforderung["bereich"] }>): Katalog {
  return {
    version: "t",
    bereiche: Array.from({ length: 10 }, (_, i) => ({ nr: (i + 1) as Anforderung["bereich"], titel: `B${i + 1}`, rechtsgrundlage: "r" })),
    anforderungen: a.map((x) => ({
      titel: "t", beschreibung: "b", rechtsgrundlage: "r", nachweisart: "automatisch", gewicht: 1, ...x,
    })) as Anforderung[],
  };
}
const f = (anforderungId: string, status: Status): Finding => ({ anforderungId, status, begruendung: "x", snapshotIds: [] });

describe("reifegrad", () => {
  it("gewichtet Teil-Erfüllung", () => {
    const r = reifegrad(kat([{ id: "X", bereich: 9, gewicht: 2 }, { id: "Y", bereich: 9, gewicht: 1 }]),
      [f("X", "teilweise"), f("Y", "erfuellt")]);
    expect(r.find((b) => b.bereich === 9)!.prozent).toBe(67);
  });
  it("nicht prüfbar zählt nicht, Bereich ohne Befunde → null", () => {
    const r = reifegrad(kat([{ id: "X", bereich: 4 }]), [f("X", "nicht_pruefbar")]);
    expect(r.find((b) => b.bereich === 4)!.prozent).toBeNull();
    expect(r).toHaveLength(10);
    expect(r.find((b) => b.bereich === 4)!.anzahl.nicht_pruefbar).toBe(1);
  });
  it("nicht_erfuellt zählt als 0 im Nenner, Titel kommt aus dem Katalog", () => {
    const r = reifegrad(kat([{ id: "X", bereich: 1 }, { id: "Y", bereich: 1 }]), [f("X", "erfuellt"), f("Y", "nicht_erfuellt")]);
    const b = r.find((x) => x.bereich === 1)!;
    expect(b.prozent).toBe(50);
    expect(b.titel).toBe("B1");
    expect(b.anzahl).toEqual({ erfuellt: 1, teilweise: 0, nicht_erfuellt: 1, nicht_pruefbar: 0 });
  });
  it("ignoriert Befunde ohne Katalogeintrag", () => {
    const r = reifegrad(kat([{ id: "X", bereich: 2 }]), [f("UNBEKANNT", "erfuellt")]);
    expect(r.find((b) => b.bereich === 2)!.prozent).toBeNull();
  });
  it("zählt automatisch geprüfte und alle Anforderungen je Bereich", () => {
    const r = reifegrad(kat([{ id: "X", bereich: 6 }, { id: "Y", bereich: 6 }, { id: "Z", bereich: 6 }, { id: "W", bereich: 7 }]),
      [f("X", "erfuellt"), f("Y", "nicht_pruefbar")]);
    const b = r.find((x) => x.bereich === 6)!;
    expect(b.automatischGeprueft).toBe(1);
    expect(b.anforderungenGesamt).toBe(3);
    expect(r.find((x) => x.bereich === 7)).toMatchObject({ automatischGeprueft: 0, anforderungenGesamt: 1 });
    expect(r.find((x) => x.bereich === 1)).toMatchObject({ automatischGeprueft: 0, anforderungenGesamt: 0 });
  });
});
