import { NextResponse } from "next/server";
import { getProfile, listRequests } from "@/lib/db";

// Always read fresh from Neon — the dashboard polls this for live updates.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [profile, requests] = await Promise.all([
      getProfile("mdm-tan"),
      listRequests("mdm-tan"),
    ]);
    return NextResponse.json({ profile, requests, at: Date.now() });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
