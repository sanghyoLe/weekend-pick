import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/catalog.server";
import { syncTourData, TourError } from "@/lib/tour-api";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return NextResponse.json({ error: "Sync is not configured" }, { status: 503 });
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.DATABASE_URL || !process.env.TOUR_API_KEY) return NextResponse.json({ error: "Data connection is not configured" }, { status: 503 });
  try { return NextResponse.json(await syncTourData(repository(), process.env.TOUR_API_KEY, Number(process.env.TOUR_DAILY_BUDGET ?? 500))); }
  catch (error) { return NextResponse.json({ error: error instanceof TourError ? error.code : "SYNC_FAILED" }, { status: 502 }); }
}
