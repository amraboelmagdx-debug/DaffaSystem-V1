/**
 * Removes server-side dev disk HR mirror and reports client keys to delete manually if needed.
 * Usage: node scripts/cleanup-hr-legacy-persist.mjs
 */
import fs from "fs";
import path from "path";

const DISK_PATH = path.join(process.cwd(), "data", "hr-workforce-persist.json");
const LEGACY_KEY = "efp-hr-workforce";

function main() {
  if (fs.existsSync(DISK_PATH)) {
    fs.unlinkSync(DISK_PATH);
    console.log("Removed:", DISK_PATH);
  } else {
    console.log("No disk file at", DISK_PATH);
  }

  console.log(
    "Browser cleanup (run in DevTools on your app origin):\n" +
      `  localStorage.removeItem("${LEGACY_KEY}");\n` +
      "  Object.keys(localStorage).filter(k => k.startsWith('efp-') && k.includes('hr-workforce')).forEach(k => console.log(k));"
  );
}

main();
