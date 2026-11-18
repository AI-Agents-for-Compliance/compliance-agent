import { z } from "zod";

export const NachweisartSchema = z.enum(["automatisch", "dokument", "bestaetigung"]);
export type Nachweisart = z.infer<typeof NachweisartSchema>;

const BereichNrSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
  z.literal(6), z.literal(7), z.literal(8), z.literal(9), z.literal(10),
]);

export const BereichSchema = z.object({
  nr: BereichNrSchema,
  titel: z.string().min(1),
  rechtsgrundlage: z.string().min(1),
});
export type Bereich = z.infer<typeof BereichSchema>;

export const AnforderungSchema = z.object({
  id: z.string().regex(/^[A-Z0-9-]+$/),
  bereich: BereichNrSchema,
  titel: z.string().min(1),
  beschreibung: z.string().min(1),
  rechtsgrundlage: z.string().min(1),
  nachweisart: NachweisartSchema,
  pruefung: z.string().min(1).optional(),
  gewicht: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
export type Anforderung = z.infer<typeof AnforderungSchema>;

export const BereicheDateiSchema = z.object({
  version: z.string().min(1),
  bereiche: z.array(BereichSchema),
});

export const AnforderungenDateiSchema = z.object({
  anforderungen: z.array(AnforderungSchema),
});

export interface Katalog {
  version: string;
  bereiche: Bereich[];
  anforderungen: Anforderung[];
}
