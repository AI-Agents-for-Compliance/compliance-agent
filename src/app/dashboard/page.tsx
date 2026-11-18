import { ladeDashboard } from "@/dashboard/daten";
import { BefundListe } from "./BefundListe";
import { BereichKarte } from "./BereichKarte";
import { laufHinweis } from "@/dashboard/lauf-hinweis";
import { zeitpunkt } from "./format";
import s from "./dashboard.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard – NIS2 Compliance-Agent" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VERBINDUNG_TEXT = { verbunden: "verbunden", getrennt: "getrennt", nicht_verbunden: "nicht verbunden" } as const;

type Param = string | string[] | undefined;
const erster = (p: Param) => (Array.isArray(p) ? p[0] : p);

export default async function DashboardSeite({ searchParams }: { searchParams: Promise<Record<string, Param>> }) {
  const sp = await searchParams;
  const tenant = erster(sp.tenant) ?? "";
  if (!UUID.test(tenant)) {
    return (
      <main className={s.seite}>
        <h1>Dashboard</h1>
        <p>Kein Mandant ausgewählt.</p>
      </main>
    );
  }
  const d = await ladeDashboard(tenant);
  const verbinden = `/api/connect/m365/start?tenant=${encodeURIComponent(tenant)}`;
  const hinweis = laufHinweis(d.letzterLauf);

  return (
    <main className={s.seite}>
      <h1>Dashboard</h1>
      {erster(sp.hinweis) === "zustimmung_abgelehnt" && (
        <p role="alert" className={s.warnung}>Die Zustimmung in Microsoft 365 wurde abgelehnt.</p>
      )}

      <section aria-labelledby="verbindung">
        <h2 id="verbindung">Verbindung</h2>
        <p>Microsoft 365: <strong>{VERBINDUNG_TEXT[d.verbindung]}</strong></p>
        {d.letzteSammlung && <p>Letzte Datenerhebung: {zeitpunkt(d.letzteSammlung)}</p>}
        {hinweis && (
          <p role="status" className={hinweis.art === "warnung" ? s.warnung : undefined}>
            {hinweis.text}
            {hinweis.art === "warnung" && d.befundeStand && ` Angezeigt werden die Befunde des letzten erfolgreichen Laufs (${zeitpunkt(d.befundeStand)}).`}
          </p>
        )}
        {d.verbindung !== "verbunden" && (
          <a className={s.knopf} href={verbinden}>
            {d.verbindung === "getrennt" ? "Microsoft 365 erneut verbinden" : "Microsoft 365 verbinden"}
          </a>
        )}
      </section>

      <section aria-labelledby="reifegrad">
        <h2 id="reifegrad">Reifegrad je Maßnahmenbereich</h2>
        <ul className={s.raster}>
          {d.reifegrad.map((r) => (
            <li key={r.bereich}><BereichKarte r={r} /></li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="befunde">
        <h2 id="befunde">Befunde</h2>
        <BefundListe befunde={d.befunde} />
      </section>
    </main>
  );
}
