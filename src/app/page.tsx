import { Explorer } from "@/components/explorer";
import { filtersSchema } from "@/lib/domain";
import { getDistricts, getEvents } from "@/lib/catalog.server";
export const dynamic = "force-dynamic";
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const parsed = filtersSchema.safeParse(raw);
  const filters = parsed.success ? parsed.data : filtersSchema.parse({});
  const notice = parsed.success ? undefined : "검색 조건을 읽지 못해 기본 주말을 보여드려요. 날짜와 지역을 다시 골라 주세요.";
  let error: string | undefined;
  let events: Awaited<ReturnType<typeof getEvents>> = [];
  let districts: Awaited<ReturnType<typeof getDistricts>> = [];
  try {
    [events, districts] = await Promise.all([getEvents(filters), getDistricts()]);
  } catch { error = "행사 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."; }
  return <main id="main" className="page-width"><Explorer key={JSON.stringify(filters)} events={events} districts={districts} filters={filters} error={error} notice={notice} /></main>;
}
