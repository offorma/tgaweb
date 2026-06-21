import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest is used for BACKEND unit tests (node environment, module mocking).
 * UI tests live in Cypress component specs (*.cy.tsx) — excluded here.
 *
 * Coverage uses the istanbul provider so its report can be merged with the
 * Cypress (vite-plugin-istanbul) coverage into one codebase-wide number.
 * See scripts/merge-coverage.mjs.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "cypress/**",
      "**/*.cy.{ts,tsx}",
      "tests/**",
      "e2e/**",
      ".next/**",
    ],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json", "html"],
      reportsDirectory: "coverage/vitest",
      all: true,
      // Vitest owns the BACKEND files; Cypress owns the UI. The two coverage
      // reports MUST cover disjoint file sets, otherwise nyc merge double-counts
      // a file instrumented by both tools. UI files live only in the Cypress report.
      include: [
        "src/lib/**/*.ts",
        "src/app/api/**/*.ts",
        "src/components/site/data.ts",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.cy.{ts,tsx}",
        "src/**/*.d.ts",
        // Type-only / barrel / generated
        "src/**/types.ts",
        "src/**/*.types.ts",
        "src/middleware.ts",
        "src/i18n/**",
        // Next.js framework shells + async server components: these run only in the
        // Next server runtime (DB fetch / RSC) and are covered by E2E, not unit/component tests.
        "src/app/**/layout.tsx",
        "src/app/**/loading.tsx",
        "src/app/**/not-found.tsx",
        "src/app/**/error.tsx",
        "src/app/**/global-error.tsx",
        "src/app/page.tsx",
        "src/app/admin/page.tsx",
        "src/app/admin/dashboard/page.tsx",
        "src/app/faculty/[slug]/page.tsx",
        "src/app/academics/[slug]/page.tsx",
        "src/app/news/[slug]/page.tsx",
        "src/components/site/data-server.ts",
      ],
    },
  },
});
