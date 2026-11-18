import type { Reifegrad } from "@/dashboard/maturity";
import { STATUS_TEXT } from "./format";
import type { Status } from "@/checks/types";
import s from "./dashboard.module.css";

const REIHENFOLGE: Status[] = ["erfuellt", "teilweise", "nicht_erfuellt", "nicht_pruefbar"];

export function BereichKarte({ r }: { r: Reifegrad }) {
  return (
    <section className={s.karte} aria-labelledby={`bereich-${r.bereich}`}>
      <h3 id={`bereich-${r.bereich}`}>
        {r.bereich}. {r.titel}
      </h3>
      {r.prozent === null ? (
        <p className={s.hinweis}>noch keine automatischen Nachweise</p>
      ) : (
        <>
          <p className={s.prozent}>{r.prozent} %</p>
          <meter min={0} max={100} value={r.prozent} aria-label={`Reifegrad ${r.titel}`} />
        </>
      )}
      <p className={s.hinweis}>
        Basis: {r.automatischGeprueft} von {r.anforderungenGesamt} Anforderungen automatisch geprüft
      </p>
      <ul className={s.anzahl}>
        {REIHENFOLGE.filter((st) => r.anzahl[st] > 0).map((st) => (
          <li key={st}>
            {r.anzahl[st]} {STATUS_TEXT[st]}
          </li>
        ))}
      </ul>
    </section>
  );
}
