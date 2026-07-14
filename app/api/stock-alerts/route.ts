import { NextResponse } from "next/server";
import { getStockAlerts, createStockAlert } from "@/lib/localdb";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ alerts: getStockAlerts() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { menu_id, passcode } = body;

    if (!menu_id || typeof menu_id !== "string" || !passcode || typeof passcode !== "string") {
      return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
    }

    const result = await createStockAlert(menu_id, passcode);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to create alert" }, { status: 401 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
