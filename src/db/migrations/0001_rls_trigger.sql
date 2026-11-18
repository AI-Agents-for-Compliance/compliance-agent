-- App-Rolle ohne BYPASSRLS (idempotent). Superuser und Tabelleneigentuemer umgehen RLS,
-- daher fuehrt withTenant() jede Transaktion per SET LOCAL ROLE als app_user aus.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD 'app_user';
  END IF;
END
$$;--> statement-breakpoint
-- Der Migrationsnutzer muss in die Rolle wechseln duerfen (SET ROLE); bei Superusern ohnehin moeglich.
DO $$
BEGIN
  IF NOT pg_has_role(current_user, 'app_user', 'MEMBER') THEN
    EXECUTE format('GRANT app_user TO %I', current_user);
  END IF;
END
$$;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO app_user;--> statement-breakpoint
GRANT SELECT ON tenants TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON m365_connections, evidence_snapshots, findings, collection_runs, audit_events TO app_user;--> statement-breakpoint

-- Mandantentrennung: fehlender oder leerer app.tenant_id (nach COMMIT bleibt '') -> NULL -> keine Zeilen.
ALTER TABLE m365_connections ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE m365_connections FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY mandant ON m365_connections USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE evidence_snapshots ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE evidence_snapshots FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY mandant ON evidence_snapshots USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE findings FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY mandant ON findings USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE collection_runs ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE collection_runs FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY mandant ON collection_runs USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY mandant ON audit_events USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint

-- Unveraenderlichkeit
CREATE FUNCTION verbiete_aenderung() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Eintrag ist unveränderlich';
END;
$$;--> statement-breakpoint
CREATE TRIGGER audit_events_unveraenderlich BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION verbiete_aenderung();--> statement-breakpoint
CREATE TRIGGER evidence_snapshots_unveraenderlich BEFORE UPDATE OR DELETE ON evidence_snapshots FOR EACH ROW EXECUTE FUNCTION verbiete_aenderung();
