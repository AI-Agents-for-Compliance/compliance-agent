import type { Check } from "../types";
import { listeAus, nichtPruefbar, prozent } from "../util";
import { ergebnis, stufe } from "./util";

const KEYS = ["m365.managedDevices"] as const;

export const geraeteVerschl: Check = {
  id: "M365-GERAETE-VERSCHL",
  benoetigt: [...KEYS],
  run(e) {
    const geraete = listeAus<{ operatingSystem?: string; isEncrypted?: boolean }>(e["m365.managedDevices"]?.data)
      .filter((d) => d.operatingSystem === "Windows" || d.operatingSystem === "macOS");
    if (geraete.length === 0) return nichtPruefbar(e, [...KEYS], "keine verwalteten Geräte");
    const n = geraete.filter((d) => d.isEncrypted === true).length;
    const anteil = n / geraete.length;
    return ergebnis(e, [...KEYS], stufe(anteil, { erfuelltAb: 0.95, teilweiseAb: 0.7 }),
      `${n} von ${geraete.length} Windows-/macOS-Geräten (${prozent(anteil)}) sind verschlüsselt.`);
  },
};
