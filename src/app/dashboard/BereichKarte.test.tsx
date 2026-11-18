// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BereichKarte } from "./BereichKarte";
import { BefundListe } from "./BefundListe";

afterEach(cleanup);
const leer = { erfuellt: 0, teilweise: 0, nicht_erfuellt: 0, nicht_pruefbar: 0 };

describe("BereichKarte", () => {
  it("zeigt deutschen Hinweis ohne Nachweise", () => {
    render(<BereichKarte r={{ bereich: 4, titel: "Sicherheit der Lieferkette", prozent: null, anzahl: leer }} />);
    expect(screen.getByText("noch keine automatischen Nachweise")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Sicherheit der Lieferkette/ })).toBeInTheDocument();
  });
  it("zeigt Prozent und Anzahlen als Text", () => {
    render(<BereichKarte r={{ bereich: 9, titel: "Zugriff", prozent: 67, anzahl: { ...leer, erfuellt: 1, teilweise: 1 } }} />);
    expect(screen.getByText("67 %")).toBeInTheDocument();
    expect(screen.getByText(/1 erfüllt/)).toBeInTheDocument();
    expect(screen.getByText(/1 teilweise/)).toBeInTheDocument();
  });
});

describe("BefundListe", () => {
  it("zeigt Anforderung, deutschen Status, Begründung und Zeitpunkt", () => {
    render(<BefundListe befunde={[
      { anforderungId: "M365-X", titel: "Titel X", status: "nicht_pruefbar", begruendung: "Keine Daten", snapshotAm: new Date("2026-01-02T10:00:00Z") },
      { anforderungId: "M365-Y", titel: "Titel Y", status: "nicht_erfuellt", begruendung: "Schlecht", snapshotAm: null },
    ]} />);
    expect(screen.getByText("nicht prüfbar")).toBeInTheDocument();
    expect(screen.getByText("nicht erfüllt")).toBeInTheDocument();
    expect(screen.getByText("Keine Daten")).toBeInTheDocument();
    expect(screen.getByText("Titel X")).toBeInTheDocument();
    expect(screen.getByText("2026-01-02 10:00 UTC")).toBeInTheDocument();
  });
  it("zeigt Hinweis bei leerer Liste", () => {
    render(<BefundListe befunde={[]} />);
    expect(screen.getByText("Noch keine Befunde vorhanden.")).toBeInTheDocument();
  });
});
