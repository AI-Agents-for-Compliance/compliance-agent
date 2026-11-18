import type { EvidenceKey } from "../../evidence/types";

export interface Endpoint {
  key: EvidenceKey;
  path: string;
  /** true: Listen-Endpunkt (paginiert, wird zu { value: [...] } zusammengeführt); false: Einzelobjekt. */
  liste: boolean;
}

/** Graph v1.0, ausschließlich lesend (GET). */
export const ENDPOINTS: readonly Endpoint[] = [
  { key: "m365.userRegistrationDetails", path: "/reports/authenticationMethods/userRegistrationDetails", liste: true },
  {
    key: "m365.globalAdmins",
    path: "/directoryRoles(roleTemplateId='62e90394-69f5-4237-9190-012177145e10')/members",
    liste: true,
  },
  { key: "m365.conditionalAccessPolicies", path: "/identity/conditionalAccess/policies", liste: true },
  { key: "m365.securityDefaults", path: "/policies/identitySecurityDefaultsEnforcementPolicy", liste: false },
  { key: "m365.authorizationPolicy", path: "/policies/authorizationPolicy", liste: false },
  {
    key: "m365.managedDevices",
    path: "/deviceManagement/managedDevices?$select=id,operatingSystem,isEncrypted,complianceState",
    liste: true,
  },
  { key: "m365.secureScores", path: "/security/secureScores?$top=1", liste: true },
  {
    key: "m365.users",
    path: "/users?$select=id,userPrincipalName,accountEnabled,userType,signInActivity",
    liste: true,
  },
];
