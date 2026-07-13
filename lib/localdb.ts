import { readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Menu, Order, OrderItem, Promo, UserRole, OrderStatus, SelectedOption } from "@/types";

// Offline JSON-backed store. Replaces Supabase for local/presentation use.
// All reads/writes go through this module. Single-process dev server only.

const DB_PATH = join(process.cwd(), "data", "db.json");

interface DBUser {
  id: string;
  username: string;
  role: UserRole;
  passcode: string;
}

interface DB {
  users: DBUser[];
  menus: Menu[];
  promos: Promo[];
  orders: Order[];
  order_items: OrderItem[];
  order_number_seq: number;
}

// --- Lightweight read cache, keyed by file mtime ---
// Avoids re-reading + re-parsing the entire db.json on every poll request.
// Still correct across module instances because we always re-read when the
// mtime changes (another process/instance wrote the file).
let cache: { mtime: number; data: DB } | null = null;

function load(): DB {
  const mtime = statSync(DB_PATH).mtimeMs;
  if (cache && cache.mtime === mtime) return cache.data;
  const raw = readFileSync(DB_PATH, "utf8");
  const data = JSON.parse(raw) as DB;
  cache = { mtime, data };
  return data;
}

function persist(db: DB) {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  cache = { mtime: statSync(DB_PATH).mtimeMs, data: db };
}

// --- Serialize read-modify-write so concurrent polls/writes don't clobber ---
let writeChain: Promise<unknown> = Promise.resolve();
function withWrite<T>(mutate: (db: DB) => T): Promise<T> {
  const run = writeChain.then(() => {
    const db = load();
    const result = mutate(db);
    persist(db);
    return result;
  });
  // Keep the chain alive even if a mutation throws.
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

// ---- Auth ----
export function verifyPasscode(role: string, passcode: string): boolean {
  const db = load();
  return db.users.some((u) => u.role === role && u.passcode === passcode);
}

// ---- Menus ----
export function getMenus(activeOnly = false): Menu[] {
  const db = load();
  const menus = activeOnly ? db.menus.filter((m) => m.is_active) : db.menus;
  return [...menus].sort((a, b) => a.category.localeCompare(b.category));
}

export async function createMenu(input: Omit<Menu, "id">): Promise<Menu> {
  return withWrite((db) => {
    const menu: Menu = {
      id: randomUUID(),
      ...input,
    };
    db.menus.push(menu);
    return menu;
  });
}

export async function updateMenu(id: string, patch: Partial<Omit<Menu, "id">>): Promise<Menu | null> {
  return withWrite((db) => {
    const menu = db.menus.find((m) => m.id === id);
    if (!menu) return null;
    Object.assign(menu, patch);
    return menu;
  });
}

export async function deleteMenu(id: string): Promise<boolean> {
  return withWrite((db) => {
    const idx = db.menus.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    db.menus.splice(idx, 1);
    return true;
  });
}

// ---- Promos ----
export function getPromos(): Promo[] {
  return load().promos;
}

export function getPromoById(id: string): Promo | null {
  return load().promos.find((p) => p.id === id) ?? null;
}

// ---- Orders ----
function attachItems(db: DB, order: Order): Order {
  const menuMap = new Map(db.menus.map((m) => [m.id, m]));
  const items = db.order_items
    .filter((i) => i.order_id === order.id)
    .map((i) => ({ ...i, menus: menuMap.get(i.menu_id) }));
  return { ...order, order_items: items };
}

export function getOrders(statuses?: OrderStatus[]): Order[] {
  const db = load();
  const filtered = statuses
    ? db.orders.filter((o) => statuses.includes(o.status))
    : db.orders;
  return filtered
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((o) => attachItems(db, o));
}

/** True when every item of the order is checked (kitchen complete guard). */
export function areAllItemsChecked(orderId: string): boolean {
  const db = load();
  const items = db.order_items.filter((i) => i.order_id === orderId);
  return items.length > 0 && items.every((i) => i.is_rejected || i.is_checked);
}

/**
 * Resolve authoritative pricing + labels for an item's chosen options against
 * the menu's configured option groups. Client-supplied price deltas are ignored;
 * we always trust the menu config. Returns the resolved options plus the unit
 * price (base + Σ deltas). Unknown groups/choices are dropped.
 */
function resolveItemPricing(
  menu: Menu,
  options: { group: string; choice: string }[] | undefined
): { unit: number; selected: SelectedOption[] } {
  let unit = menu.price;
  const selected: SelectedOption[] = [];
  if (!options || options.length === 0 || !menu.option_groups) {
    return { unit, selected };
  }
  for (const sel of options) {
    const group = menu.option_groups.find((g) => g.name === sel.group);
    if (!group) continue;
    const opt = group.options.find((o) => o.label === sel.choice);
    if (!opt) continue;
    const price_delta = Number(opt.price_delta) || 0;
    unit += price_delta;
    selected.push({ group: group.name, choice: opt.label, price_delta });
  }
  return { unit, selected };
}

export async function createOrder(
  items: { menu_id: string; qty: number; options?: { group: string; choice: string }[] }[],
  promoId: string | null
): Promise<{ order_number: number } | { error: string }> {
  return withWrite((db) => {
    const menuMap = new Map(db.menus.map((m) => [m.id, m]));

    let subtotal = 0;
    const orderItems: { menu_id: string; qty: number; subtotal_price: number; selected_options: SelectedOption[] }[] = [];
    for (const item of items) {
      const menu = menuMap.get(item.menu_id);
      if (menu === undefined) continue;
      const { unit, selected } = resolveItemPricing(menu, item.options);
      const subtotal_price = unit * item.qty;
      subtotal += subtotal_price;
      orderItems.push({ menu_id: item.menu_id, qty: item.qty, subtotal_price, selected_options: selected });
    }
    if (orderItems.length === 0) return { error: "No valid items found." };

    const tax_amount = subtotal * 0.1;
    let discount_amount = 0;
    if (promoId) {
      const promo = db.promos.find((p) => p.id === promoId);
      if (promo && promo.is_active) {
        discount_amount = subtotal * (promo.discount_percent / 100);
      }
    }
    const total_price = subtotal + tax_amount - discount_amount;

    const order_number = db.order_number_seq + 1;
    db.order_number_seq = order_number;

    const orderId = randomUUID();
    const order: Order = {
      id: orderId,
      order_number,
      subtotal,
      tax_amount,
      discount_amount,
      total_price,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    db.orders.push(order);
    for (const oi of orderItems) {
      db.order_items.push({
        id: randomUUID(),
        order_id: orderId,
        menu_id: oi.menu_id,
        qty: oi.qty,
        subtotal_price: oi.subtotal_price,
        selected_options: oi.selected_options,
        is_checked: false,
      });
    }
    return { order_number };
  });
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  paymentMethod?: string
): Promise<boolean> {
  return withWrite((db) => {
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) return false;
    order.status = status;
    if (paymentMethod) order.payment_method = paymentMethod;
    return true;
  });
}

export async function updateOrderItemChecked(itemId: string, isChecked: boolean): Promise<boolean> {
  return withWrite((db) => {
    const item = db.order_items.find((i) => i.id === itemId);
    if (!item) return false;
    item.is_checked = isChecked;
    return true;
  });
}

/** Kitchen marks an item as unavailable ("habis") so the cashier can adjust. */
export async function setOrderItemRejected(itemId: string, rejected: boolean): Promise<boolean> {
  return withWrite((db) => {
    const item = db.order_items.find((i) => i.id === itemId);
    if (!item) return false;
    item.is_rejected = rejected;

    // Recompute the parent order's totals so the cashier charges (and the
    // receipt shows) only the non-rejected items.
    const order = db.orders.find((o) => o.id === item.order_id);
    if (order) {
      const subtotal = db.order_items
        .filter((i) => i.order_id === order.id && !i.is_rejected)
        .reduce((sum, i) => sum + i.subtotal_price, 0);
      const tax_amount = subtotal * 0.1;
      order.subtotal = subtotal;
      order.tax_amount = tax_amount;
      order.total_price = Math.max(0, subtotal + tax_amount - (order.discount_amount || 0));
    }
    return true;
  });
}

/**
 * Admin edits an order: rebuild its line items from `items` and recompute
 * subtotal/tax. Discount is preserved from the original order.
 */
export async function updateOrder(
  orderId: string,
  items: { menu_id: string; qty: number; options?: { group: string; choice: string }[] }[]
): Promise<{ success: boolean; error?: string }> {
  return withWrite((db) => {
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: "Order not found" };

    const menuMap = new Map(db.menus.map((m) => [m.id, m]));
    let subtotal = 0;
    const nextItems: typeof db.order_items = [];
    for (const it of items) {
      const menu = menuMap.get(it.menu_id);
      if (menu === undefined || it.qty <= 0) continue;
      const { unit, selected } = resolveItemPricing(menu, it.options);
      subtotal += unit * it.qty;
      nextItems.push({
        id: randomUUID(),
        order_id: orderId,
        menu_id: it.menu_id,
        qty: it.qty,
        subtotal_price: unit * it.qty,
        selected_options: selected,
        is_checked: false,
      });
    }
    if (nextItems.length === 0) return { success: false, error: "Order must have at least one item" };

    // Drop old items, insert new ones.
    db.order_items = db.order_items.filter((i) => i.order_id !== orderId);
    db.order_items.push(...nextItems);

    const tax_amount = subtotal * 0.1;
    order.subtotal = subtotal;
    order.tax_amount = tax_amount;
    order.total_price = Math.max(0, subtotal + tax_amount - (order.discount_amount || 0));
    return { success: true };
  });
}
