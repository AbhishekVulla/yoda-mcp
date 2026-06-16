import { NextResponse } from "next/server";
import { decideRequest } from "@/lib/db";

// Caregiver approves/declines a request: { id: number, decision: "approve" | "decline" }
export async function POST(req: Request) {
  try {
    const { id, decision } = await req.json();
    if (typeof id !== "number" || (decision !== "approve" && decision !== "decline")) {
      return NextResponse.json({ error: "id (number) and decision (approve|decline) required" }, { status: 400 });
    }
    await decideRequest(id, decision);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
