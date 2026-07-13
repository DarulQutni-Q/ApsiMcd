import { NextResponse } from "next/server";
import { verifyPasscode } from "@/lib/localdb";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { passcode, role } = body;

    if (!passcode || typeof passcode !== "string" || !role || typeof role !== "string") {
      return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
    }

    if (verifyPasscode(role, passcode)) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
