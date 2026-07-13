// One-off export: pulls all rows from Supabase into data/db.json for offline use.
// Run once while online: `node scripts/export-to-json.mjs`
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Minimal .env.local parser
const env = {};
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

async function fetchAll(table, select = "*") {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const res = await fetch(`${URL}/rest/v1/${table}?select=${select}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${to}` },
    });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const chunk = await res.json();
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return rows;
}

const [users, menus, promos, orders, order_items] = await Promise.all([
  fetchAll("users"),
  fetchAll("menus"),
  fetchAll("promos"),
  fetchAll("orders"),
  fetchAll("order_items"),
]);

const maxOrderNumber = orders.reduce((m, o) => Math.max(m, o.order_number || 0), 0);

const db = {
  users,
  menus,
  promos,
  orders,
  order_items,
  order_number_seq: maxOrderNumber,
};

const dataDir = join(root, "data");
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
writeFileSync(join(dataDir, "db.json"), JSON.stringify(db, null, 2));

console.log(
  `Exported: ${users.length} users, ${menus.length} menus, ${promos.length} promos, ${orders.length} orders, ${order_items.length} order_items. Next order # = ${maxOrderNumber + 1}`
);
