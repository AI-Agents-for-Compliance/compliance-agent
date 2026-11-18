import type { Status } from "@/checks/types";

export const STATUS_TEXT: Record<Status, string> = {
  erfuellt: "erfüllt",
  teilweise: "teilweise",
  nicht_erfuellt: "nicht erfüllt",
  nicht_pruefbar: "nicht prüfbar",
};

/** Deterministisch (UTC), z. B. "2026-01-02 10:00 UTC". */
export function zeitpunkt(d: Date): string {
  return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}
