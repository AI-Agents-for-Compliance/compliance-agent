import type { Check } from "../types";
import { caRichtlinien, ergebnis, SD_CA_KEYS, securityDefaultsAktiv, type CaPolicy } from "./util";

const blockiertLegacy = (p: CaPolicy) => {
  const apps = p.conditions?.clientAppTypes ?? [];
  return apps.includes("exchangeActiveSync") && apps.includes("other")
    && p.grantControls?.builtInControls?.includes("block") === true;
};

export const legacyAuth: Check = {
  id: "M365-LEGACY-AUTH",
  benoetigt: ["m365.securityDefaults"],
  optional: ["m365.conditionalAccessPolicies"],
  run(e) {
    if (securityDefaultsAktiv(e)) {
      return ergebnis(e, SD_CA_KEYS, "erfuellt", "Security Defaults sind aktiv und blockieren Legacy-Authentifizierung.");
    }
    const ca = caRichtlinien(e);
    if ("result" in ca) return ca.result;
    const passend = ca.policies.filter(blockiertLegacy);
    if (passend.some((p) => p.state === "enabled")) {
      return ergebnis(e, SD_CA_KEYS, "erfuellt", "Eine aktive Conditional-Access-Richtlinie blockiert Legacy-Authentifizierung.");
    }
    if (passend.some((p) => p.state === "enabledForReportingButNotEnforced")) {
      return ergebnis(e, SD_CA_KEYS, "teilweise",
        "Eine Richtlinie zur Blockierung von Legacy-Authentifizierung ist nur im Berichtsmodus und wird nicht durchgesetzt.");
    }
    return ergebnis(e, SD_CA_KEYS, "nicht_erfuellt",
      "Security Defaults sind aus und keine aktive Richtlinie blockiert Legacy-Authentifizierung.");
  },
};
