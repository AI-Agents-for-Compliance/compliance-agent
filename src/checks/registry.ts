import type { Check } from "./types";
import { adminMfa } from "./m365/admin-mfa";
import { gaeste } from "./m365/gaeste";
import { geraeteCompliance } from "./m365/geraete-compliance";
import { geraeteVerschl } from "./m365/geraete-verschl";
import { globalAdmins } from "./m365/global-admins";
import { createInaktiveKontenCheck } from "./m365/inaktive-konten";
import { legacyAuth } from "./m365/legacy-auth";
import { mfaErzwungen } from "./m365/mfa-erzwungen";
import { secureScore } from "./m365/secure-score";
import { userMfa } from "./m365/user-mfa";

const alle: Check[] = [
  adminMfa, userMfa, mfaErzwungen, legacyAuth, globalAdmins, gaeste,
  createInaktiveKontenCheck(() => new Date()), geraeteVerschl, geraeteCompliance, secureScore,
];

export const registry: ReadonlyMap<string, Check> = new Map(alle.map((c) => [c.id, c]));
