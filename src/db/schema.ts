import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const tenantId = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => tenants.id);

export const tenants = pgTable("tenants", {
  id: id(),
  name: text("name").notNull(),
});

export const m365Connections = pgTable("m365_connections", {
  id: id(),
  tenantId: tenantId(),
  msTenantId: text("ms_tenant_id").notNull(),
  status: text("status", { enum: ["aktiv", "getrennt"] }).notNull(),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
  lastCollectedAt: timestamp("last_collected_at", { withTimezone: true }),
});

export const evidenceSnapshots = pgTable("evidence_snapshots", {
  id: id(),
  tenantId: tenantId(),
  source: text("source").notNull(),
  key: text("key").notNull(),
  status: text("status").notNull(),
  payload: jsonb("payload").notNull(),
  sha256: text("sha256").notNull(),
  collectedAt: timestamp("collected_at", { withTimezone: true }).notNull().defaultNow(),
});

export const collectionRuns = pgTable("collection_runs", {
  id: id(),
  tenantId: tenantId(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  ergebnis: text("ergebnis"),
});

export const findings = pgTable("findings", {
  id: id(),
  tenantId: tenantId(),
  anforderungId: text("anforderung_id").notNull(),
  status: text("status").notNull(),
  begruendung: text("begruendung").notNull(),
  snapshotIds: uuid("snapshot_ids").array().notNull().default(sql`'{}'::uuid[]`),
  runId: uuid("run_id").references(() => collectionRuns.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditEvents = pgTable("audit_events", {
  id: id(),
  tenantId: tenantId(),
  actor: text("actor").notNull(),
  aktion: text("aktion").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
