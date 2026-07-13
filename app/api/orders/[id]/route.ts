import { NextResponse } from "next/server";
import { updateOrder, verifyPasscode } from "@/lib/localdb";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { items, passcode } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing order id" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Items must be a non-empty array" }, { status: 400 });
    }
    if (!passcode || typeof passcode !== "string") {
      return NextResponse.json({ error: "Missing passcode" }, { status: 400 });
    }
    if (!verifyPasscode("admin", passcode)) {
      return NextResponse.json({ error: "Invalid passcode for admin role" }, { status: 401 });
    }

    const result = await updateOrder(id, items);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
