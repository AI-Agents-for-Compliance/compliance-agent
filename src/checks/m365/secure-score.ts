import type { Check } from "../types";
import { listeAus, nichtPruefbar } from "../util";
import { ergebnis, stufe } from "./util";

const KEYS = ["m365.secureScores"] as const;

interface Score { currentScore: number; maxScore: number; createdDateTime: string }

export const secureScore: Check = {
  id: "M365-SECURE-SCORE",
  benoetigt: [...KEYS],
  run(e) {
    const neuester = listeAus<Score>(e["m365.secureScores"]?.data).reduce<Score | undefined>(
      (a, s) => (!a || new Date(s.createdDateTime).getTime() > new Date(a.createdDateTime).getTime() ? s : a),
      undefined,
    );
    if (!neuester || !(neuester.maxScore > 0)) return nichtPruefbar(e, [...KEYS], "kein Secure Score verfügbar");
    const anteil = neuester.currentScore / neuester.maxScore;
    return ergebnis(e, [...KEYS], stufe(anteil, { erfuelltAb: 0.6, teilweiseAb: 0.4 }),
      `Secure Score ${neuester.currentScore} von ${neuester.maxScore} (${Math.round(anteil * 100)} %).`);
  },
};
