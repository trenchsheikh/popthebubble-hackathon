import { NextResponse } from "next/server";
import { extractProfile } from "@/lib/ai/profile-extract";
import type { DinerProfile } from "@/lib/types";

type ExtractBody = {
  text?: string;
  previousProfile?: DinerProfile;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ExtractBody;
  if (!body.text?.trim()) return NextResponse.json({ error: "Text is required." }, { status: 400 });

  const response = await extractProfile({
    text: body.text,
    previousProfile: body.previousProfile
  });

  return NextResponse.json(response);
}
