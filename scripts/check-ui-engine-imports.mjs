#!/usr/bin/env node
/**
 * CI guard: UI layers must not import forecast/workbook engines directly.
 * Hooks under src/hooks should delegate to orchestrators (evaluateEconomicsGraph, etc.).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src/app", "src/components"];
/** Type-only imports from workbook-engine are allowed; block direct engine execution. */
const LINE_IMPORT_FORBIDDEN = /^import\s+(?!type\b).*workbook-engine/;
const FILE_FORBIDDEN = [
  /\brunForecastEngine\s*\(/,
  /\bapplyScenario\s*\(/,
  /\bpickBlendedMargin\s*\(/,
  /\bcomputeWorkbookTargets\s*\(/,
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules") continue;
      walk(p, files);
    } else if (/\.(tsx?|jsx?)$/.test(name)) {
      files.push(p);
    }
  }
  return files;
}

const violations = [];
for (const dir of SCAN_DIRS) {
  const abs = join(ROOT, dir);
  try {
    for (const file of walk(abs)) {
      const text = readFileSync(file, "utf8");
      let hit = false;
      for (const line of text.split("\n")) {
        if (LINE_IMPORT_FORBIDDEN.test(line)) {
          violations.push({ file: relative(ROOT, file), pattern: String(LINE_IMPORT_FORBIDDEN) });
          hit = true;
          break;
        }
      }
      if (hit) continue;
      for (const pattern of FILE_FORBIDDEN) {
        if (pattern.test(text)) {
          violations.push({ file: relative(ROOT, file), pattern: String(pattern) });
          break;
        }
      }
    }
  } catch {
    // dir may not exist in some workspaces
  }
}

if (violations.length) {
  console.error("Forbidden engine imports in UI:\n");
  for (const v of violations) {
    console.error(`  ${v.file} (${v.pattern})`);
  }
  process.exit(1);
}

console.log("UI engine import check passed.");
