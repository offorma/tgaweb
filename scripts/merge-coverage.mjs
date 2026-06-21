#!/usr/bin/env node
/**
 * Merge Vitest (backend) + Cypress (UI) istanbul coverage into a single
 * codebase-wide report.
 *
 *   - Vitest writes coverage/vitest/coverage-final.json   (backend files)
 *   - Cypress (@cypress/code-coverage) writes .nyc_output/out.json (UI files)
 *
 * The two reports cover DISJOINT file sets (see vitest.config.ts / cypress.config.ts),
 * so the merge is a clean union. We use istanbul-lib-coverage directly rather than
 * `nyc report`, which mis-handles the vite-plugin-istanbul map format for small
 * files (reporting 0 total lines).
 *
 * Pass --check to exit non-zero when any metric is below THRESHOLD (default 95).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import libCoverage from "istanbul-lib-coverage";
import { createContext } from "istanbul-lib-report";
import reports from "istanbul-reports";

const THRESHOLD = Number(process.env.COVERAGE_THRESHOLD || 95);
const check = process.argv.includes("--check");
const OUT_DIR = "coverage/merged";

const SOURCES = [
  { label: "vitest", path: "coverage/vitest/coverage-final.json" },
  { label: "cypress", path: ".nyc_output/out.json" },
];

const map = libCoverage.createCoverageMap({});
let found = 0;
for (const s of SOURCES) {
  if (existsSync(s.path)) {
    map.merge(JSON.parse(readFileSync(s.path, "utf8")));
    console.log(`✓ included ${s.label} coverage (${s.path})`);
    found++;
  } else {
    console.log(`⚠ skipped ${s.label} — not found at ${s.path}`);
  }
}
if (found === 0) {
  console.error("✗ No coverage inputs found. Run `npm run test:cov` and/or `npm run test:ui:cov` first.");
  process.exit(1);
}

// Emit HTML + lcov + json reports.
mkdirSync(OUT_DIR, { recursive: true });
const context = createContext({ dir: OUT_DIR, coverageMap: map });
for (const r of ["html", "lcovonly", "json-summary"]) {
  reports.create(r, r === "lcovonly" ? { file: "lcov.info" } : {}).execute(context);
}

// Compute the global summary.
const summary = libCoverage.createCoverageSummary();
for (const f of map.files()) summary.merge(map.fileCoverageFor(f).toSummary());
const d = summary.data;
const pc = (m) => `${m.pct}% (${m.covered}/${m.total})`;

console.log("\n── Merged coverage (Vitest backend + Cypress UI) ──");
console.log(`  Lines      ${pc(d.lines)}`);
console.log(`  Statements ${pc(d.statements)}`);
console.log(`  Functions  ${pc(d.functions)}`);
console.log(`  Branches   ${pc(d.branches)}`);
console.log("───────────────────────────────────────────────────");
console.log(`  HTML report: ${OUT_DIR}/index.html`);

writeFileSync(`${OUT_DIR}/summary.json`, JSON.stringify(d, null, 2));

if (check) {
  const metrics = ["lines", "statements", "functions", "branches"];
  const failures = metrics.filter((m) => d[m].pct < THRESHOLD);
  if (failures.length) {
    console.error(
      `\n✗ Coverage gate FAILED (threshold ${THRESHOLD}%): ` +
        failures.map((m) => `${m} ${d[m].pct}%`).join(", ")
    );
    process.exit(1);
  }
  console.log(`\n✓ Coverage gate PASSED — all metrics ≥ ${THRESHOLD}%`);
}
