import { NextResponse, type NextRequest } from "next/server";
import { pruefeBasicAuth } from "@/auth/basic-auth";

/**
 * Demo-Zugang (Plan 1): HTTP-Basic-Auth ueber DEMO_BASIC_AUTH="user:pass".
 * Geschuetzt ist alles ausser /api/health (siehe matcher), also auch den
 * Microsoft-Callback /api/connect/m365/callback: der Browser sendet die
 * Zugangsdaten der Sitzung bei der Rueckleitung mit. Fail closed: ohne
 * DEMO_BASIC_AUTH antwortet die App mit 503.
 * (Next 16: "proxy" ersetzt die Konvention "middleware".)
 */
export function proxy(req: NextRequest): NextResponse {
  const erwartet = process.env.DEMO_BASIC_AUTH;
  if (!erwartet) {
    return new NextResponse("Demo-Zugang nicht konfiguriert", { status: 503 });
  }
  if (pruefeBasicAuth(req.headers.get("authorization"), erwartet)) return NextResponse.next();
  return new NextResponse("Anmeldung erforderlich", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Compliance-Agent Demo", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!api/health$|_next/static|_next/image|favicon.ico).*)"],
};
