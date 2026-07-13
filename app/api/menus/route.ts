import { NextResponse } from "next/server";
import {
  getMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  verifyPasscode,
} from "@/lib/localdb";
import type { MenuOptionGroup } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Validate + normalize a menu's option_groups from untrusted input.
 * Returns null when the shape is invalid.
 */
function sanitizeOptionGroups(raw: unknown): MenuOptionGroup[] | null {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return null;
  const groups: MenuOptionGroup[] = [];
  for (const g of raw) {
    if (!g || typeof g !== "object") return null;
    const name = typeof g.name === "string" ? g.name.trim() : "";
    if (!name) return null;
    if (!Array.isArray(g.options)) return null;
    const options = [];
    for (const o of g.options) {
      if (!o || typeof o !== "object") return null;
      const label = typeof o.label === "string" ? o.label.trim() : "";
      if (!label) return null;
      const price_delta = Number(o.price_delta);
      if (!Number.isFinite(price_delta) || price_delta < 0) return null;
      options.push({ label, price_delta });
    }
    if (options.length === 0) return null;
    groups.push({ name, required: g.required !== false, options });
  }
  return groups;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("activeOnly") === "true";
  return NextResponse.json({ menus: getMenus(activeOnly) });
}

function authAdmin(passcode: unknown): boolean {
  return typeof passcode === "string" && verifyPasscode("admin", passcode);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, price, image_url, is_active, option_groups, passcode } = body;
    if (!authAdmin(passcode)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (typeof name !== "string" || !name.trim() || typeof category !== "string" || !category.trim()) {
      return NextResponse.json({ error: "Name and category are required" }, { status: 400 });
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }
    const groups = sanitizeOptionGroups(option_groups);
    if (groups === null) {
      return NextResponse.json({ error: "Invalid option groups" }, { status: 400 });
    }
    const menu = await createMenu({
      name: name.trim(),
      category: category.trim(),
      price: priceNum,
      image_url: typeof image_url === "string" ? image_url : "",
      is_active: is_active !== false,
      option_groups: groups,
    });
    return NextResponse.json({ success: true, menu });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, category, price, image_url, is_active, option_groups, passcode } = body;
    if (!authAdmin(passcode)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (typeof id !== "string" || !id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (category !== undefined) patch.category = String(category).trim();
    if (price !== undefined) {
      const priceNum = Number(price);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        return NextResponse.json({ error: "Invalid price" }, { status: 400 });
      }
      patch.price = priceNum;
    }
    if (image_url !== undefined) patch.image_url = String(image_url);
    if (is_active !== undefined) patch.is_active = Boolean(is_active);
    if (option_groups !== undefined) {
      const groups = sanitizeOptionGroups(option_groups);
      if (groups === null) {
        return NextResponse.json({ error: "Invalid option groups" }, { status: 400 });
      }
      patch.option_groups = groups;
    }

    const menu = await updateMenu(id, patch);
    if (!menu) return NextResponse.json({ error: "Menu not found" }, { status: 404 });
    return NextResponse.json({ success: true, menu });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id, passcode } = body;
    if (!authAdmin(passcode)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (typeof id !== "string" || !id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const ok = await deleteMenu(id);
    if (!ok) return NextResponse.json({ error: "Menu not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
