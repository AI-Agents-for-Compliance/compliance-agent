import { describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog/load";
import { evaluate } from "../checks/evaluate";
import { registry } from "../checks/registry";
import { ENDPOINTS } from "../collectors/m365/endpoints";
import { getAllPages, getEinzeln } from "../collectors/m365/graph";
import type { EvidenceBundle } from "../evidence/types";
import { createFakeGraphFetcher } from "./fake-graph";

describe("Fake-Graph", () => {
  it("ergibt ein gemischtes Bild mit allen vier Status", async () => {
    const f = createFakeGraphFetcher();
    const bundle: EvidenceBundle = {};
    for (const ep of ENDPOINTS) {
      const r = ep.liste ? await getAllPages(f, ep.path) : await getEinzeln(f, ep.path);
      bundle[ep.key] = { snapshotId: ep.key, status: r.status, data: r.data, collectedAt: new Date() };
    }
    expect(bundle["m365.conditionalAccessPolicies"]?.status).toBe("not_licensed");
    const katalog = loadCatalog("catalog", new Set(registry.keys()));
    const ergebnisse = evaluate(katalog, bundle);
    const status = new Set(ergebnisse.map((x) => x.status));
    expect(status).toEqual(new Set(["erfuellt", "teilweise", "nicht_erfuellt", "nicht_pruefbar"]));
    expect(ergebnisse.some((x) => x.begruendung.startsWith("Lizenz fehlt:"))).toBe(true);
  });
});
