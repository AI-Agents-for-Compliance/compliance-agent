import { describe, expect, it } from "vitest";
import { pruefeLokaleDatenbank } from "./guard";

describe("pruefeLokaleDatenbank", () => {
  it.each(["localhost", "127.0.0.1", "[::1]"])("erlaubt %s", (h) => {
    expect(() => pruefeLokaleDatenbank(`postgresql://u:p@${h}:5432/db`, {})).not.toThrow();
  });
  it("lehnt fremde Hosts ab und nennt den Host", () => {
    expect(() => pruefeLokaleDatenbank("postgresql://u:p@db.prod.example.com:5432/db", {})).toThrow(/db\.prod\.example\.com/);
  });
  it("erlaubt fremde Hosts mit ALLOW_DEMO=1", () => {
    expect(() => pruefeLokaleDatenbank("postgresql://u:p@db.prod.example.com/db", { ALLOW_DEMO: "1" })).not.toThrow();
  });
  it("lehnt ungültige URL ab", () => {
    expect(() => pruefeLokaleDatenbank("kaputt", {})).toThrow(/gültige URL/);
  });
});
