/**
 * Patch expo-sqlite web WorkerChannel so sync results >255 bytes don't corrupt.
 *
 * Upstream writes the payload length with `Uint8Array.set(new Uint32Array([len]))`,
 * which only stores a single byte. JSON.parse then fails with
 * "Unterminated string in JSON".
 */
const fs = require("fs");
const path = require("path");

const target = path.join(
  __dirname,
  "..",
  "node_modules",
  "expo-sqlite",
  "web",
  "WorkerChannel.ts"
);

if (!fs.existsSync(target)) {
  console.warn("[patch-expo-sqlite-web] WorkerChannel.ts not found, skipping");
  process.exit(0);
}

const source = fs.readFileSync(target, "utf8");

let next = source;
let changed = false;

if (next.includes("resultArray.set(new Uint32Array([length]), 0)")) {
  next = next.replace(
    "resultArray.set(new Uint32Array([length]), 0);",
    "new DataView(resultBuffer).setUint32(0, length, true);"
  );
  changed = true;
}

// Prefer serializing Error.message (Error objects stringify to {}).
if (
  next.includes("serialize({ error })") &&
  !next.includes("error instanceof Error ? error.message")
) {
  next = next.replace(
    "serialize({ error })",
    "serialize({ error: error instanceof Error ? error.message : String(error) })"
  );
  changed = true;
}

// Larger sync result buffer for catalog-sized queries.
if (next.includes("new SharedArrayBuffer(1024 * 1024)")) {
  next = next.replace(
    "new SharedArrayBuffer(1024 * 1024)",
    "new SharedArrayBuffer(8 * 1024 * 1024)"
  );
  changed = true;
}

if (!changed) {
  if (next.includes("new DataView(resultBuffer).setUint32(0, length, true)")) {
    console.log("[patch-expo-sqlite-web] already applied");
    process.exit(0);
  }
  console.warn("[patch-expo-sqlite-web] unexpected WorkerChannel contents, skipping");
  process.exit(0);
}

fs.writeFileSync(target, next);
console.log("[patch-expo-sqlite-web] applied");
