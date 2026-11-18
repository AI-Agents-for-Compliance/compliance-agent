import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { ZodType } from "zod";
import {
  AnforderungenDateiSchema,
  BereicheDateiSchema,
  type Anforderung,
  type Katalog,
} from "./schema";

export class CatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogError";
  }
}

function lesen<T>(datei: string, schema: ZodType<T>): T {
  let roh: unknown;
  try {
    roh = parse(readFileSync(datei, "utf8"));
  } catch (e) {
    throw new CatalogError(`${datei}: Datei nicht lesbar (${(e as Error).message})`);
  }
  const ergebnis = schema.safeParse(roh);
  if (!ergebnis.success) {
    const details = ergebnis.error.issues
      .map((i) => `${i.path.join(".") || "(Wurzel)"}: ${i.message}`)
      .join("; ");
    throw new CatalogError(`${datei}: ungültiges Schema (${details})`);
  }
  return ergebnis.data;
}

export function loadCatalog(
  dir: string,
  bekanntePruefungen: ReadonlySet<string>,
): Katalog {
  const { version, bereiche } = lesen(join(dir, "bereiche.yaml"), BereicheDateiSchema);

  for (let nr = 1; nr <= 10; nr++) {
    if (!bereiche.some((b) => b.nr === nr)) {
      throw new CatalogError(`Bereich ${nr} fehlt`);
    }
  }
  if (bereiche.length !== 10) {
    throw new CatalogError("Bereiche müssen genau die Nummern 1 bis 10 enthalten (doppelte Bereichsnummer)");
  }

  const anforderungsDir = join(dir, "anforderungen");
  const dateien = readdirSync(anforderungsDir)
    .filter((f) => f.endsWith(".yaml"))
    .sort();
  const anforderungen: Anforderung[] = [];
  const ids = new Set<string>();
  for (const f of dateien) {
    const { anforderungen: liste } = lesen(join(anforderungsDir, f), AnforderungenDateiSchema);
    for (const a of liste) {
      if (ids.has(a.id)) throw new CatalogError(`doppelte ID: ${a.id}`);
      ids.add(a.id);
      if (a.nachweisart === "automatisch") {
        if (!a.pruefung) throw new CatalogError(`${a.id}: pruefung fehlt`);
        if (!bekanntePruefungen.has(a.pruefung)) {
          throw new CatalogError(`unbekannte Prüfung: ${a.pruefung}`);
        }
      }
      anforderungen.push(a);
    }
  }

  return { version, bereiche, anforderungen };
}
