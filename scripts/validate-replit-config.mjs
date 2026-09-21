import { readFile } from "node:fs/promises";

const file = process.argv[2] ?? new URL("../.replit", import.meta.url);
const source = await readFile(file, "utf8");
const tables = new Set();
const keysByTable = new Map([["", new Set()]]);
const arrayTableCounts = new Map();
let table = "";

function fail(message, lineNumber) {
  console.error(`Invalid .replit configuration at line ${lineNumber}: ${message}`);
  process.exit(1);
}

for (const [index, rawLine] of source.split(/\r?\n/).entries()) {
  const lineNumber = index + 1;
  const line = rawLine.replace(/\s+#.*$/, "").trim();
  if (!line || line.startsWith("#")) continue;

  const arrayTableMatch = line.match(/^\[\[([A-Za-z0-9_.-]+)\]\]$/);
  if (arrayTableMatch) {
    const name = arrayTableMatch[1];
    const count = (arrayTableCounts.get(name) ?? 0) + 1;
    arrayTableCounts.set(name, count);
    table = `${name}#${count}`;
    keysByTable.set(table, new Set());
    continue;
  }

  const tableMatch = line.match(/^\[([A-Za-z0-9_.-]+)\]$/);
  if (tableMatch) {
    table = tableMatch[1];
    if (tables.has(table)) fail(`duplicate table [${table}]`, lineNumber);
    tables.add(table);
    keysByTable.set(table, new Set());
    continue;
  }

  const keyMatch = line.match(/^([A-Za-z0-9_.-]+)\s*=/);
  if (!keyMatch) continue;
  const key = keyMatch[1];
  const keys = keysByTable.get(table) ?? new Set();
  if (keys.has(key)) {
    fail(`duplicate key "${key}"${table ? ` in [${table}]` : ""}`, lineNumber);
  }
  keys.add(key);
  keysByTable.set(table, keys);
}

if (!tables.has("deployment")) {
  fail("missing required [deployment] table", 1);
}

console.log(".replit configuration is valid and contains no duplicate keys or tables.");