import type { Check } from "../types";
import { nichtPruefbar } from "../util";
import { ergebnis } from "./util";

const KEYS = ["m365.authorizationPolicy"] as const;
const EINGESCHRAENKTESTE = "2af84b1e-32c8-42b7-82bc-daa82404023b";
const EINGESCHRAENKT = "10dae51f-b6af-4016-8d66-8c2a99b929b3";

const MITGLIEDERGLEICH = "a0b1b346-4d3e-4e8b-98f8-753987be4970";

export const gaeste: Check = {
  id: "M365-GAESTE",
  benoetigt: [...KEYS],
  run(e) {
    const id = (e["m365.authorizationPolicy"]?.data as { guestUserRoleId?: string } | null)?.guestUserRoleId;
    if (id === EINGESCHRAENKTESTE) {
      return ergebnis(e, [...KEYS], "erfuellt", "Gastzugriffe sind auf die eigenen Objekte beschränkt (restriktivste Einstellung).");
    }
    if (id === EINGESCHRAENKT) {
      return ergebnis(e, [...KEYS], "teilweise", "Gastzugriffe sind eingeschränkt, aber nicht auf die restriktivste Stufe.");
    }
    if (id === MITGLIEDERGLEICH) {
      return ergebnis(e, [...KEYS], "nicht_erfuellt", `Gäste haben weitreichende Verzeichnisrechte (Rollen-ID: ${id}).`);
    }
    return nichtPruefbar(e, [...KEYS], `Gastrollen-ID unbekannt: ${id ?? "fehlt"}`);
  },
};
