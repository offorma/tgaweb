import { defineConfig } from "cypress";
import { fileURLToPath } from "node:url";

/**
 * Cypress is used for UI component testing (cy.mount). React components are
 * mounted in a real browser and the network is stubbed with cy.intercept —
 * no running Next.js server or database required.
 *
 * When CYPRESS_COVERAGE=true, vite-plugin-istanbul instruments the source so
 * @cypress/code-coverage can emit an istanbul report (merged with Vitest's).
 * vite-plugin-istanbul v9 is ESM-only, so it's loaded via dynamic import()
 * inside the (async) viteConfig — a top-level import would break config load.
 */
const collectCoverage = process.env.CYPRESS_COVERAGE === "true";

const COVERAGE_EXCLUDE = [
  "node_modules",
  "**/*.test.ts",
  "**/*.cy.{ts,tsx}",
  "src/i18n/**",
  "src/middleware.ts",
  // Backend files belong to the Vitest report — exclude here so the two
  // coverage reports cover disjoint file sets (clean nyc merge).
  "src/lib/**",
  "src/app/api/**",
  "src/components/site/data.ts",
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
];

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
      viteConfig: async () => {
        const plugins = [];
        if (collectCoverage) {
          const istanbul = (await import("vite-plugin-istanbul")).default;
          plugins.push(
            istanbul({
              include: "src/**/*.{ts,tsx}",
              exclude: COVERAGE_EXCLUDE,
              extension: [".ts", ".tsx"],
              requireEnv: false,
              forceBuildInstrument: true,
            })
          );
        }
        return { resolve: { alias }, plugins };
      },
    },
    specPattern: "src/**/*.cy.{ts,tsx}",
    supportFile: "cypress/support/component.tsx",
    indexHtmlFile: "cypress/support/component-index.html",
    video: false,
    setupNodeEvents(on, config) {
      if (collectCoverage) {
        require("@cypress/code-coverage/task")(on, config);
      }
      return config;
    },
  },
});
