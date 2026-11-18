import type { Check } from "../types";
import { listeAus, nichtPruefbar, prozent } from "../util";
import { ergebnis, stufe } from "./util";

const KEYS = ["m365.userRegistrationDetails"] as const;

interface Reg { isMfaRegistered: boolean; userType?: string }

export const userMfa: Check = {
  id: "M365-USER-MFA",
  benoetigt: [...KEYS],
  run(e) {
    const mitglieder = listeAus<Reg>(e["m365.userRegistrationDetails"]?.data)
      .filter((r) => r.userType?.toLowerCase() === "member");
    if (mitglieder.length === 0) return nichtPruefbar(e, [...KEYS], "keine Benutzer gefunden");
    const mitMfa = mitglieder.filter((r) => r.isMfaRegistered).length;
    const anteil = mitMfa / mitglieder.length;
    return ergebnis(e, [...KEYS], stufe(anteil, { erfuelltAb: 0.95, teilweiseAb: 0.5 }),
      `${mitMfa} von ${mitglieder.length} Benutzern (${prozent(anteil)}) sind für MFA registriert.`);
  },
};
