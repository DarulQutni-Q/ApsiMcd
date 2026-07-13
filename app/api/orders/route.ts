import { NextResponse } from "next/server";
import {
  getOrders,
  createOrder,
  updateOrderStatus,
  verifyPasscode,
  areAllItemsChecked,
} from "@/lib/localdb";
import type { OrderStatus } from "@/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES: OrderStatus[] = ["pending", "preparing", "ready", "completed", "cancelled"];

// GET: read orders, optionally filtered by ?status=pending,preparing
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const statuses = statusParam
    ? (statusParam.split(",").filter((s) => VALID_STATUSES.includes(s as OrderStatus)) as OrderStatus[])
    : undefined;
  return NextResponse.json({ orders: getOrders(statuses) });
}

// POST: Kiosk creates an order
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
      return NextResponse.json({ error: "Invalid payload: Cart cannot be empty." }, { status: 400 });
    }
    const result = await createOrder(payload.items, payload.promo_id ?? null);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, order_number: result.order_number });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH: Kitchen/Cashier update order status
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { order_id, status, passcode, role } = body;

    if (
      !order_id || typeof order_id !== "string" ||
      !status || typeof status !== "string" ||
      !passcode || typeof passcode !== "string" ||
      !role || typeof role !== "string"
    ) {
      return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
    }

    if (!verifyPasscode(role, passcode)) {
      return NextResponse.json({ error: "Invalid passcode or role" }, { status: 401 });
    }

    if (!VALID_STATUSES.includes(status as OrderStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (role === "kitchen" && !["preparing", "ready"].includes(status)) {
      return NextResponse.json({ error: "Kitchen can only update to preparing or ready" }, { status: 403 });
    }
    if (role === "cashier" && !["completed", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Cashier can only complete or cancel orders" }, { status: 403 });
    }

    // Kitchen may only mark an order "ready" once every item is checked off.
    if (role === "kitchen" && status === "ready" && !areAllItemsChecked(order_id)) {
      return NextResponse.json({ error: "All items must be checked before marking ready" }, { status: 403 });
    }

    const ok = await updateOrderStatus(order_id, status as OrderStatus, body.payment_method);
    if (!ok) return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
