import type { Check } from "../types";
import { caRichtlinien, ergebnis, SD_CA_KEYS, securityDefaultsAktiv } from "./util";

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
    const mitMfa = ca.policies.filter(
      (p) => p.state === "enabled" && p.grantControls?.builtInControls?.includes("mfa"),
    );
    if (mitMfa.some((p) => p.conditions?.users?.includeUsers?.includes("All"))) {
      return ergebnis(e, SD_CA_KEYS, "erfuellt", "Eine aktive Conditional-Access-Richtlinie erzwingt MFA für alle Benutzer.");
    }
    if (mitMfa.length > 0) {
      return ergebnis(e, SD_CA_KEYS, "teilweise",
        `${mitMfa.length} aktive Conditional-Access-Richtlinie(n) erzwingen MFA, aber nicht für alle Benutzer.`);
    }
    return ergebnis(e, SD_CA_KEYS, "nicht_erfuellt",
      "Security Defaults sind aus und keine aktive Conditional-Access-Richtlinie erzwingt MFA.");
  },
};
