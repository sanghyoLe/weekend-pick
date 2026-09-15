import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getEvent, getNearby, isDemo, repository } from "@/lib/catalog.server";
import { isFresh, planSchema, todayKST } from "@/lib/domain";
import { encodeDemoPlan } from "@/lib/sharing";

export async function POST(request: NextRequest) {
  // Next's internal URL may use 0.0.0.0/localhost when bound to all interfaces.
  // Match the browser Origin to the HTTP Host, not that internal URL.
  const origin = request.headers.get("origin");
  if (origin) {
    let sameHost = false;
    try { const url = new URL(origin); sameHost = ["http:", "https:"].includes(url.protocol) && url.host === (request.headers.get("host") ?? request.nextUrl.host); } catch { /* invalid origin */ }
    if (!sameHost) return NextResponse.json({ error: "같은 사이트에서 공유해 주세요." }, { status: 403 });
  }
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 2048) return NextResponse.json({ error: "공유할 장소가 너무 많아요." }, { status: 413 });
    const text = await request.text();
    if (text.length > 2048) return NextResponse.json({ error: "공유할 장소가 너무 많아요." }, { status: 413 });
    let body: unknown;
    try { body = JSON.parse(text); } catch { return NextResponse.json({ error: "올바른 계획을 선택해 주세요." }, { status: 400 }); }
    const input = planSchema.safeParse(body);
    if (!input.success) return NextResponse.json({ error: "날짜와 장소를 다시 확인해 주세요." }, { status: 400 });
    const event = await getEvent(input.data.eventId);
    if (!event || !isFresh(event) || event.status !== "scheduled" || input.data.date < event.startDate || input.data.date > event.endDate || input.data.date < todayKST()) return NextResponse.json({ error: "이 날짜에는 행사를 추천할 수 없어요. 다른 날짜를 선택해 주세요." }, { status: 400 });
    const nearby = await getNearby(event);
    if (input.data.placeIds.some(id => !nearby.some(p => p.id === id))) return NextResponse.json({ error: "행사 주변의 장소를 선택해 주세요." }, { status: 400 });
    if (isDemo()) return NextResponse.json({ path: `/s/${encodeDemoPlan(input.data)}` }, { status: 201 });
    const repo = repository();
    // Only Vercel's trusted platform header is used; local/other hosts share a bucket.
    const ip = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for") ?? "unknown" : "shared";
    const bucket = createHash("sha256").update(`${ip}:${Math.floor(Date.now() / 3600000)}`).digest("hex");
    if (!await repo.takeBudget(`share:${bucket}`, 30, 7200)) return NextResponse.json({ error: "공유 요청이 많아요. 잠시 후 다시 시도해 주세요." }, { status: 429 });
    const plan = await repo.createPlan(input.data);
    return NextResponse.json({ path: `/s/${plan.id}` }, { status: 201 });
  } catch { return NextResponse.json({ error: "공유 링크를 만들지 못했어요. 다시 시도해 주세요." }, { status: 503 }); }
}
