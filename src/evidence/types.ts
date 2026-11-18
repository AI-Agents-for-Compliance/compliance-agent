export type EvidenceKey =
  | "m365.userRegistrationDetails"
  | "m365.globalAdmins"
  | "m365.conditionalAccessPolicies"
  | "m365.securityDefaults"
  | "m365.authorizationPolicy"
  | "m365.managedDevices"
  | "m365.secureScores"
  | "m365.users";

export type EvidenceStatus = "ok" | "permission_denied" | "not_licensed" | "error";

export interface EvidenceItem {
  snapshotId: string;
  status: EvidenceStatus;
  data: unknown;
  collectedAt: Date;
}

export type EvidenceBundle = Partial<Record<EvidenceKey, EvidenceItem>>;
