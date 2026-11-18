import type { Check } from "../types";
import { listeAus, nichtPruefbar, prozent } from "../util";
import { ergebnis, stufe } from "./util";

const KEYS = ["m365.managedDevices"] as const;

export const geraeteCompliance: Check = {
  id: "M365-GERAETE-COMPLIANCE",
  benoetigt: [...KEYS],
  run(e) {
    const geraete = listeAus<{ complianceState?: string }>(e["m365.managedDevices"]?.data);
    if (geraete.length === 0) return nichtPruefbar(e, [...KEYS], "keine verwalteten Geräte");
    const n = geraete.filter((d) => d.complianceState === "compliant").length;
    const anteil = n / geraete.length;
    return ergebnis(e, [...KEYS], stufe(anteil, { erfuelltAb: 0.9, teilweiseAb: 0.6 }),
      `${n} von ${geraete.length} verwalteten Geräten (${prozent(anteil)}) sind konform.`);
  },
};
