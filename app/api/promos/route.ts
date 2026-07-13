import { NextResponse } from "next/server";
import { getPromos } from "@/lib/localdb";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ promos: getPromos() });
}
