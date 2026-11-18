import type { Tx } from "../../db/client";
import { storeSnapshot } from "../../evidence/snapshot";
import type { EvidenceBundle } from "../../evidence/types";
import { ENDPOINTS } from "./endpoints";
import { getAllPages, getEinzeln, TokenError, type GraphFetcher } from "./graph";

/** Zustimmung entzogen / Token nicht beschaffbar; der Aufrufer rollt die Transaktion zurück. */
export class ConsentRevokedError extends Error {
  constructor(message = "Microsoft-365-Zustimmung entzogen oder Token nicht beschaffbar", options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ConsentRevokedError";
  }
}

/** Sammelt alle Endpunkte nacheinander (eine Transaktion, eine Verbindung) und speichert je einen Snapshot. */
export async function collectM365(tx: Tx, f: GraphFetcher, sleep?: (ms: number) => Promise<void>): Promise<EvidenceBundle> {
  const bundle: EvidenceBundle = {};
  for (const ep of ENDPOINTS) {
    let result;
    try {
      result = ep.liste ? await getAllPages(f, ep.path, sleep) : await getEinzeln(f, ep.path, sleep);
    } catch (e) {
      if (e instanceof TokenError) throw new ConsentRevokedError(undefined, { cause: e });
      throw e;
    }
    bundle[ep.key] = await storeSnapshot(tx, { key: ep.key, status: result.status, payload: result.data, source: "m365" });
  }
  return bundle;
}
