import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const testDb = process.env.TEST_DATABASE_URL ?? "postgresql://dev:dev@localhost:5432/compliance_test";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    globalSetup: ["./src/db/test-setup.ts"],
    // Alle DB-Tests teilen sich eine Datenbank: Dateien nacheinander ausfuehren.
    fileParallelism: false,
    env: { DATABASE_URL: testDb, TEST_DATABASE_URL: testDb },
  },
});
