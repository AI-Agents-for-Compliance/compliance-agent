import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidStateError, signState, verifyState } from "./state";

const A = "11111111-1111-4111-8111-111111111111";
beforeEach(() => vi.stubEnv("CONNECT_STATE_SECRET", "x".repeat(40)));
afterEach(() => vi.unstubAllEnvs());

describe("state", () => {
  it("Rundlauf", () => {
    expect(verifyState(signState(A))).toEqual({ tenantId: A });
  });
  it("manipuliert → InvalidStateError", () => {
    expect(() => verifyState(signState(A) + "x")).toThrow(InvalidStateError);
    const [p, s] = signState(A).split(".");
    expect(() => verifyState(`${p}A.${s}`)).toThrow(InvalidStateError);
  });
  it("Müll / falsches Format", () => {
    for (const s of ["", "abc", "a.b.c", "."]) expect(() => verifyState(s)).toThrow(InvalidStateError);
  });
  it("abgelaufen nach 10 Minuten", () => {
    const s = signState(A, new Date(Date.now() - 11 * 60_000));
    expect(() => verifyState(s)).toThrow(InvalidStateError);
    expect(verifyState(signState(A, new Date(Date.now() - 9 * 60_000)))).toEqual({ tenantId: A });
  });
  it("anderes Secret → ungültig", () => {
    const s = signState(A);
    vi.stubEnv("CONNECT_STATE_SECRET", "y".repeat(40));
    expect(() => verifyState(s)).toThrow(InvalidStateError);
  });
  it("Secret fehlt oder zu kurz → klarer Fehler", () => {
    vi.stubEnv("CONNECT_STATE_SECRET", "kurz");
    expect(() => signState(A)).toThrow(/CONNECT_STATE_SECRET/);
    vi.stubEnv("CONNECT_STATE_SECRET", "");
    expect(() => verifyState("a.b")).toThrow(/CONNECT_STATE_SECRET/);
  });
  it("signState lehnt Nicht-UUID ab", () => {
    expect(() => signState("nope")).toThrow();
  });
});
