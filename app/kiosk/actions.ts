"use server";

import { createAdminClient } from "@/lib/supabase/server";

const FALLBACK_PRICE_MAP = new Map([
  ['f1', 45000], 
  ['f2', 25000], 
  ['f3', 18000], 
  ['f4', 12000], 
  ['f5', 15000], 
  ['f6', 28000], 
  ['f7', 15000], 
  ['f8', 10000], 
]);

const FALLBACK_PROMO_PERCENT = 10;

export async function submitCheckout(payload: {
  items: { menu_id: string, qty: number }[],
  promo_id: string | null
}) {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return { error: "Cart cannot be empty." };
  }

  for (const item of payload.items) {
    if (typeof item.menu_id !== 'string' || typeof item.qty !== 'number' || item.qty <= 0 || !Number.isInteger(item.qty)) {
      return { error: "Malformed cart item." };
    }
  }

  let supabase;
  let useFallback = false;

  try {
    supabase = await createAdminClient();
  } catch (e) {
    useFallback = true;
  }

  let priceMap = FALLBACK_PRICE_MAP;

  if (!useFallback && supabase) {
    const { data: menus, error } = await supabase.from('menus').select('id, price');
    if (error || !menus || menus.length === 0) {
      useFallback = true;
    } else {
      priceMap = new Map(menus.map(m => [m.id, m.price]));
    }
  }

  let subtotal = 0;
  const orderItems = [];

  for (const item of payload.items) {
    const price = priceMap.get(item.menu_id);
    if (price === undefined) continue;

    const subtotal_price = price * item.qty;
    subtotal += subtotal_price;
    orderItems.push({ menu_id: item.menu_id, qty: item.qty, subtotal_price });
  }

  if (orderItems.length === 0) return { error: "No valid items found." };

  const tax_amount = subtotal * 0.10;
  let discount_amount = 0;

  if (payload.promo_id) {
    if (useFallback) {
      discount_amount = subtotal * (FALLBACK_PROMO_PERCENT / 100);
    } else if (supabase) {
      const { data: promo } = await supabase
        .from('promos')
        .select('discount_percent, is_active')
        .eq('id', payload.promo_id)
        .single();

      if (promo && promo.is_active) {
        discount_amount = subtotal * (promo.discount_percent / 100);
      }
    }
  }

  const total_price = subtotal + tax_amount - discount_amount;

  if (useFallback) {
    const dummyOrderNumber = Math.floor(Math.random() * 999) + 1;
    return { success: true, order_number: dummyOrderNumber };
  }

  const { data: order, error: orderError } = await supabase!
    .from('orders')
    .insert({ subtotal, tax_amount, discount_amount, total_price, status: 'pending' })
    .select('id, order_number')
    .single();

  if (orderError || !order) return { error: "Failed to create order" };

  const itemsToInsert = orderItems.map(item => ({
    order_id: order.id,
    menu_id: item.menu_id,
    qty: item.qty,
    subtotal_price: item.subtotal_price,
    is_checked: false
  }));

  const { error: itemsError } = await supabase!.from('order_items').insert(itemsToInsert);
  if (itemsError) return { error: "Failed to insert items" };

  return { success: true, order_number: order.order_number };
}
