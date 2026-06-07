import { NextResponse } from "next/server";
import { requireRestaurantOwner } from "@/lib/auth";
import { getRestaurantOwnerId, updateMenuItemImage, uploadDishImage } from "@/lib/db/queries";

export const runtime = "nodejs";
export const maxDuration = 30;

// Uploads ONE dish photo to the dish-images bucket and attaches its URL to the
// menu item. Called once per dish after publish, so each request stays small
// (one image) instead of cramming the whole menu's photos into the publish call.
function dataUrlToFile(dataUrl: string, name: string): File {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "image/jpeg";
  const buffer = Buffer.from(b64, "base64");
  return new File([buffer], name, { type: mime });
}

export async function POST(request: Request) {
  let ownerId: string;
  try {
    const user = await requireRestaurantOwner();
    ownerId = user.id;
  } catch {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  let body: { restaurantId?: string; itemId?: string; dataUrl?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { restaurantId, itemId, dataUrl } = body;
  if (!restaurantId || !itemId || !dataUrl?.startsWith("data:image")) {
    return NextResponse.json({ ok: false, error: "Missing restaurantId, itemId, or image" }, { status: 400 });
  }

  // Only the owner of this restaurant may attach images to its dishes.
  const owner = await getRestaurantOwnerId(restaurantId);
  if (owner !== ownerId) {
    return NextResponse.json({ ok: false, error: "Not your restaurant" }, { status: 403 });
  }

  try {
    const file = dataUrlToFile(dataUrl, `${itemId}.jpg`);
    const url = await uploadDishImage(restaurantId, file, itemId);
    await updateMenuItemImage(restaurantId, itemId, url);
    return NextResponse.json({ ok: true, url });
  } catch {
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 502 });
  }
}
