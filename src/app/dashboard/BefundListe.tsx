import type { BefundZeile } from "@/dashboard/daten";
import { STATUS_TEXT, zeitpunkt } from "./format";
import s from "./dashboard.module.css";

export function BefundListe({ befunde }: { befunde: BefundZeile[] }) {
  if (befunde.length === 0) return <p>Noch keine Befunde vorhanden.</p>;
  return (
    <table className={s.tabelle}>
      <caption className={s.nur_sr}>Befunde des letzten erfolgreichen Laufs</caption>
      <thead>
        <tr>
          <th scope="col">Anforderung</th>
          <th scope="col">Status</th>
          <th scope="col">Begründung</th>
          <th scope="col">Nachweis erhoben</th>
        </tr>
      </thead>
      <tbody>
        {befunde.map((b) => (
          <tr key={b.anforderungId}>
            <th scope="row">
              <span>{b.titel}</span>
              <br />
              <code>{b.anforderungId}</code>
            </th>
            <td>{STATUS_TEXT[b.status]}</td>
            <td>{b.begruendung}</td>
            <td>{b.snapshotAm ? zeitpunkt(b.snapshotAm) : "–"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
