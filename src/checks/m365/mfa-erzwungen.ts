import type { Check } from "../types";
import { bewerteRichtlinien, caRichtlinien, ergebnis, mfaWirkung, SD_CA_KEYS, securityDefaultsAktiv } from "./util";

export const mfaErzwungen: Check = {
  id: "M365-MFA-ERZWUNGEN",
  benoetigt: ["m365.securityDefaults"],
  optional: ["m365.conditionalAccessPolicies"],
  run(e) {
    if (securityDefaultsAktiv(e)) {
      return ergebnis(e, SD_CA_KEYS, "erfuellt", "Security Defaults sind aktiv und erzwingen MFA.");
    }
    const ca = caRichtlinien(e);
    if ("result" in ca) return ca.result;
    const b = bewerteRichtlinien(ca.policies, mfaWirkung);
    if (b?.status === "erfuellt") {
      return ergebnis(e, SD_CA_KEYS, "erfuellt",
        `Eine aktive Conditional-Access-Richtlinie erzwingt MFA für alle Benutzer und Anwendungen${b.detail ? ` (${b.detail})` : ""}.`);
    }
    if (b) {
      return ergebnis(e, SD_CA_KEYS, "teilweise", `Eine Conditional-Access-Richtlinie erzwingt MFA, aber ${b.detail}.`);
    }
    return ergebnis(e, SD_CA_KEYS, "nicht_erfuellt",
      "Security Defaults sind aus und keine Conditional-Access-Richtlinie erzwingt MFA zwingend.");
  },
};
