import { NextRequest, NextResponse } from "next/server";
import { filtersSchema, idSchema } from "@/lib/domain";
import { getEvents, isDemo } from "@/lib/catalog.server";
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const filters = filtersSchema.safeParse(Object.fromEntries(params));
  if (!filters.success) return NextResponse.json({ error: "날짜와 검색 조건을 확인해 주세요." }, { status: 400 });
  const ids = params.has("ids") ? (params.get("ids") ?? "").split(",").filter(Boolean) : undefined;
  if (ids && (ids.length > 100 || ids.some(id => !idSchema.safeParse(id).success))) return NextResponse.json({ error: "저장한 장소 목록을 확인해 주세요." }, { status: 400 });
  try { return NextResponse.json({ events: await getEvents(ids ? undefined : filters.data, ids), demo: isDemo() }); }
  catch { return NextResponse.json({ error: "행사 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 503 }); }
}
