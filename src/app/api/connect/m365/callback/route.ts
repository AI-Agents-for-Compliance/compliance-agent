import { eq } from "drizzle-orm";
import { InvalidStateError, verifyState } from "@/connect/state";
import { recordAudit } from "@/db/audit";
import { m365Connections } from "@/db/schema";
import { withTenant } from "@/db/tenant";
import { enqueueCollection } from "@/jobs/boss";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTOR = "system:verbinden";

const bad = (msg: string) => new Response(msg, { status: 400 });
const redirect = (path: string) => Response.redirect(`${(process.env.APP_URL ?? "").replace(/\/+$/, "")}${path}`, 302);

export async function GET(req: Request): Promise<Response> {
  const q = new URL(req.url).searchParams;

  let tenantId: string;
  try {
    tenantId = verifyState(q.get("state") ?? "").tenantId;
  } catch (e) {
    if (e instanceof InvalidStateError) return bad("Ungültiger oder abgelaufener state");
    throw e;
  }

  if (q.has("error")) {
    await withTenant(tenantId, (tx) =>
      recordAudit(tx, { actor: ACTOR, aktion: "zustimmung_abgelehnt", details: { fehler: q.get("error") } }),
    );
    return redirect(`/dashboard?tenant=${tenantId}&hinweis=zustimmung_abgelehnt`);
  }

  if ((q.get("admin_consent") ?? "").toLowerCase() !== "true") return bad("Zustimmung fehlt");
  const msTenantId = q.get("tenant") ?? "";
  if (!GUID.test(msTenantId)) return bad("Ungültige Microsoft-Mandanten-ID");

  await withTenant(tenantId, async (tx) => {
    const [existing] = await tx.select().from(m365Connections).where(eq(m365Connections.tenantId, tenantId)).limit(1);
    if (existing) {
      await tx
        .update(m365Connections)
        .set({ msTenantId, status: "aktiv", connectedAt: new Date() })
        .where(eq(m365Connections.id, existing.id));
    } else {
      await tx.insert(m365Connections).values({ tenantId, msTenantId, status: "aktiv" });
    }
    const details: Record<string, string> = { msTenantId };
    if (existing && existing.msTenantId !== msTenantId) details.vorherigerMsTenantId = existing.msTenantId;
    await recordAudit(tx, { actor: ACTOR, aktion: "verbindung_hergestellt", details });
  });

  // Nach dem Commit einreihen; bei Fehler bleibt die Verbindung bestehen (täglicher Job holt nach).
  try {
    await enqueueCollection(tenantId);
  } catch (e) {
    console.error("Sammel-Job konnte nicht eingereiht werden:", e);
  }
  return redirect(`/dashboard?tenant=${tenantId}`);
}
