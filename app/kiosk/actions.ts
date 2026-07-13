"use server";

import { createOrder } from "@/lib/localdb";

export async function submitCheckout(payload: {
  items: { menu_id: string; qty: number; options?: { group: string; choice: string }[] }[];
  promo_id: string | null;
}) {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return { error: "Cart cannot be empty." };
  }

  for (const item of payload.items) {
    if (
      typeof item.menu_id !== "string" ||
      typeof item.qty !== "number" ||
      item.qty <= 0 ||
      !Number.isInteger(item.qty)
    ) {
      return { error: "Malformed cart item." };
    }
    if (item.options !== undefined) {
      if (!Array.isArray(item.options)) return { error: "Malformed cart item." };
      for (const opt of item.options) {
        if (!opt || typeof opt.group !== "string" || typeof opt.choice !== "string") {
          return { error: "Malformed cart item." };
        }
      }
    }
  }

  const result = await createOrder(payload.items, payload.promo_id ?? null);
  if ("error" in result) return { error: result.error };
  return { success: true, order_number: result.order_number };
}
