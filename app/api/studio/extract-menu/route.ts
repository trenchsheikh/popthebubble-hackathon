import { NextResponse } from "next/server";
import { extractMenuItems } from "@/lib/studio/menu-extract";

export const runtime = "nodejs";
export const maxDuration = 60;

type ExtractBody = { images?: unknown };

export async function POST(request: Request) {
  const body = (await request.json()) as ExtractBody;
  const images = Array.isArray(body.images) ? body.images.filter((entry): entry is string => typeof entry === "string") : [];
  if (images.length === 0) {
    return NextResponse.json({ error: "No menu images provided." }, { status: 400 });
  }
  const result = await extractMenuItems(images);
  return NextResponse.json(result);
}
