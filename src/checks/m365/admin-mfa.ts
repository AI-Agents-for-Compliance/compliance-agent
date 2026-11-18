import type { Check } from "../types";
import { listeAus, namenListe, nichtPruefbar } from "../util";
import { ergebnis } from "./util";

const KEYS = ["m365.userRegistrationDetails"] as const;

interface Reg { userPrincipalName: string; isAdmin: boolean; isMfaRegistered: boolean }

export const adminMfa: Check = {
  id: "M365-ADMIN-MFA",
  benoetigt: [...KEYS],
  run(e) {
    const admins = listeAus<Reg>(e["m365.userRegistrationDetails"]?.data).filter((r) => r.isAdmin);
    if (admins.length === 0) return nichtPruefbar(e, [...KEYS], "keine Administratoren gefunden");
    const ohne = admins.filter((a) => !a.isMfaRegistered).map((a) => a.userPrincipalName);
    if (ohne.length === 0) {
      return ergebnis(e, [...KEYS], "erfuellt", `Alle ${admins.length} Administratoren sind für MFA registriert.`);
    }
    return ergebnis(e, [...KEYS], "nicht_erfuellt",
      `${ohne.length} von ${admins.length} Administratoren ohne MFA: ${namenListe(ohne)}.`);
  },
};
