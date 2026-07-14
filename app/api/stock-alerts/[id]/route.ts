import { NextResponse } from "next/server";
import { resolveStockAlert } from "@/lib/localdb";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { passcode } = body;

    if (!id || !passcode || typeof passcode !== "string") {
      return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
    }

    const result = await resolveStockAlert(id, passcode);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to resolve alert" }, { status: 401 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
