import type { Check } from "../types";
import { listeAus } from "../util";
import { ergebnis } from "./util";

const KEYS = ["m365.globalAdmins"] as const;

export const globalAdmins: Check = {
  id: "M365-GLOBAL-ADMINS",
  benoetigt: [...KEYS],
  run(e) {
    const n = listeAus(e["m365.globalAdmins"]?.data).length;
    if (n >= 2 && n <= 4) {
      return ergebnis(e, [...KEYS], "erfuellt", `${n} Globale Administratoren (empfohlen: 2 bis 4).`);
    }
    return ergebnis(e, [...KEYS], "nicht_erfuellt", `${n} Globale Administratoren, empfohlen sind 2 bis 4.`);
  },
};
