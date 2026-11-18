import type { Check } from "../types";
import { bewerteRichtlinien, caRichtlinien, ergebnis, SD_CA_KEYS, securityDefaultsAktiv, type CaPolicy } from "./util";

const blockiertLegacy = (p: CaPolicy): string[] | undefined => {
  const apps = p.conditions?.clientAppTypes ?? [];
  return apps.includes("exchangeActiveSync") && apps.includes("other")
    && p.grantControls?.builtInControls?.includes("block") === true ? [] : undefined;
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
    const b = bewerteRichtlinien(ca.policies, blockiertLegacy);
    if (b?.status === "erfuellt") {
      return ergebnis(e, SD_CA_KEYS, "erfuellt",
        `Eine aktive Conditional-Access-Richtlinie blockiert Legacy-Authentifizierung für alle${b.detail ? ` (${b.detail})` : ""}.`);
    }
    if (b) {
      return ergebnis(e, SD_CA_KEYS, "teilweise", `Eine Richtlinie blockiert Legacy-Authentifizierung, aber ${b.detail}.`);
    }
    return ergebnis(e, SD_CA_KEYS, "nicht_erfuellt",
      "Security Defaults sind aus und keine Richtlinie blockiert Legacy-Authentifizierung.");
  },
};
