import type { Check } from "../types";
import { listeAus, nichtPruefbar, prozent } from "../util";
import { ergebnis } from "./util";

const KEYS = ["m365.users"] as const;
const TAGE_MS = 90 * 86_400_000;

interface User {
  accountEnabled?: boolean;
  userType?: string;
  signInActivity?: { lastSignInDateTime?: string | null };
}

export function createInaktiveKontenCheck(now: () => Date): Check {
  return {
    id: "M365-INAKTIVE-KONTEN",
    benoetigt: [...KEYS],
    run(e) {
      const basis = listeAus<User>(e["m365.users"]?.data)
        .filter((u) => u.accountEnabled === true && u.userType?.toLowerCase() === "member");
      if (basis.length === 0) return nichtPruefbar(e, [...KEYS], "keine aktiven Konten");
      if (!basis.some((u) => u.signInActivity !== undefined)) {
        return nichtPruefbar(e, [...KEYS], "Anmeldedaten nicht verfügbar");
      }
      const grenze = now().getTime() - TAGE_MS;
      const inaktiv = basis.filter((u) => {
        const t = u.signInActivity?.lastSignInDateTime;
        if (!t) return true;
        const ms = new Date(t).getTime();
        return Number.isNaN(ms) || ms < grenze;
      }).length;
      const anteil = inaktiv / basis.length;
      const status = anteil <= 0.05 ? "erfuellt" : anteil <= 0.15 ? "teilweise" : "nicht_erfuellt";
      return ergebnis(e, [...KEYS], status,
        `${inaktiv} von ${basis.length} aktiven Mitgliedskonten (${prozent(anteil)}) ohne Anmeldung seit 90 Tagen.`);
    },
  };
}
