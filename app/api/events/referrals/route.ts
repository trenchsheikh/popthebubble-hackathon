import { NextResponse } from "next/server";
import { listReferrals } from "@/lib/events/store";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? undefined;
  return NextResponse.json({ ok: true, referrals: listReferrals(slug) });
}
