import type { Check } from "./types";

const alle: Check[] = [];

export const registry: ReadonlyMap<string, Check> = new Map(alle.map((c) => [c.id, c]));
