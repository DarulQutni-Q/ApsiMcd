import { NextResponse } from "next/server";
import { setOrderItemRejected, verifyPasscode } from "@/lib/localdb";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { item_id, is_rejected, passcode } = body;

    if (
      !item_id || typeof item_id !== "string" ||
      is_rejected === undefined || typeof is_rejected !== "boolean" ||
      !passcode || typeof passcode !== "string"
    ) {
      return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
    }

    if (!verifyPasscode("kitchen", passcode)) {
      return NextResponse.json({ error: "Invalid passcode for kitchen role" }, { status: 401 });
    }

    const ok = await setOrderItemRejected(item_id, is_rejected);
    if (!ok) return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
