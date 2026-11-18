import { eq } from "drizzle-orm";
import { signState } from "@/connect/state";
import { getDb } from "@/db/client";
import { tenants } from "@/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request): Promise<Response> {
  const tenant = new URL(req.url).searchParams.get("tenant") ?? "";
  if (!UUID.test(tenant)) return new Response("Ungültige Mandanten-ID", { status: 400 });
  const found = await getDb().select({ id: tenants.id }).from(tenants).where(eq(tenants.id, tenant)).limit(1);
  if (found.length === 0) return new Response("Unbekannter Mandant", { status: 400 });

  const appUrl = (process.env.APP_URL ?? "").replace(/\/+$/, "");
  const clientId = process.env.M365_CLIENT_ID ?? "";
  if (!appUrl || !clientId) return new Response("APP_URL oder M365_CLIENT_ID nicht konfiguriert", { status: 500 });

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "https://graph.microsoft.com/.default",
    redirect_uri: `${appUrl}/api/connect/m365/callback`,
    state: signState(tenant),
  });
  return Response.redirect(`https://login.microsoftonline.com/organizations/v2.0/adminconsent?${params}`, 302);
}
