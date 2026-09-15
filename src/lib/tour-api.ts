import { addDays, checkedDateKST, isDate, safeUrl, todayKST, type EventItem, type PlaceItem } from "./domain";
import type { Repository } from "./database";

type Item = Record<string, string | number | undefined>;
const BASE = "https://apis.data.go.kr/B551011/KorService2";
export class TourError extends Error {
  constructor(public code: string) { super(`TourAPI: ${code}`); }
}
export function plainText(input: unknown): string {
  return String(input ?? "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ").trim().slice(0, 16000);
}
function homepage(input: unknown): string {
  const value = String(input ?? "");
  return safeUrl(value.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] ?? value);
}
function tourDate(input: unknown): string {
  const raw = String(input ?? "");
  const date = raw.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");
  return isDate(date) ? date : "";
}
function coordinate(input: unknown, min: number, max: number): number | null {
  if (input === "" || input === undefined) return null;
  const value = Number(input);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}
export function normalizeEvent(list: Item, common: Item, intro: Item, region: EventItem["region"]): EventItem | null {
  const data = { ...list, ...common, ...intro };
  const startDate = tourDate(data.eventstartdate), endDate = tourDate(data.eventenddate);
  const id = String(data.contentid ?? ""), title = plainText(data.title), address = plainText(data.addr1);
  if (!/^\d{1,30}$/.test(id) || !title || !startDate || !endDate || endDate < startDate || !address) return null;
  const imageType = String(data.cpyrhtDivCd ?? "");
  const rawImage = safeUrl(String(data.firstimage ?? "").replace(/^http:/, "https:"));
  const image = ["Type1", "Type3", "1", "3"].includes(imageType) && rawImage.startsWith("https://tong.visitkorea.or.kr/cms/resource/") ? rawImage : null;
  const category = /전시|미술|박물관/.test(title) ? "전시·문화" : /먹거리|음식|푸드|미식/.test(title) ? "먹거리" : /정원|숲|걷기|산책|꽃/.test(title) ? "자연·산책" : "공연·축제";
  return { id, title, subtitle: `${region}에서 만나는 ${category}`, region, district: address.split(" ")[1] ?? region, category,
    startDate, endDate, address, lat: coordinate(data.mapy, 33, 39), lng: coordinate(data.mapx, 124, 132),
    description: plainText(data.overview) || plainText(data.program) || "자세한 프로그램은 주최 측 안내를 확인해 주세요.",
    price: plainText(data.usetimefestival), hours: plainText(data.playtime), image,
    imageCredit: image ? `한국관광공사 TourAPI · 공공누리 ${imageType.includes("3") ? "3" : "1"}유형` : "",
    sourceUrl: homepage(data.homepage) || `https://korean.visitkorea.or.kr/search/search_list.do?keyword=${encodeURIComponent(title)}`,
    sourceName: "한국관광공사 TourAPI", checkedAt: new Date().toISOString(), status: "scheduled", demo: false };
}
export function normalizePlace(item: Item): PlaceItem | null {
  const id = String(item.contentid ?? ""), title = plainText(item.title), address = plainText(item.addr1);
  const lat = coordinate(item.mapy, 33, 39), lng = coordinate(item.mapx, 124, 132);
  if (!/^\d{1,30}$/.test(id) || !title || !address || lat === null || lng === null) return null;
  return { id, title, address, lat, lng, category: String(item.contenttypeid) === "14" ? "문화시설" : "관광지", hours: "운영시간은 방문 전 확인해 주세요.", description: "행사 주변에서 함께 들를 만한 장소입니다.", sourceUrl: `https://korean.visitkorea.or.kr/search/search_list.do?keyword=${encodeURIComponent(title)}`, demo: false };
}

export function parseTourResponse(value: unknown): { items: Item[]; total: number } {
  if (!value || typeof value !== "object") throw new TourError("INVALID_RESPONSE");
  const response = (value as { response?: { header?: { resultCode?: string }; body?: { items?: { item?: Item | Item[] } | string; totalCount?: number } } }).response;
  const code = String(response?.header?.resultCode ?? "");
  if (!["0000", "00"].includes(code)) throw new TourError(code || "INVALID_RESPONSE");
  const body = response?.body;
  const item = typeof body?.items === "object" ? body.items?.item : undefined;
  const items = Array.isArray(item) ? item : item && typeof item === "object" ? [item] : [];
  return { items, total: Number(body?.totalCount ?? items.length) || 0 };
}

export function createTourClient(key: string, reserve: () => Promise<boolean>, fetcher: typeof fetch = fetch, deadline = Infinity) {
  let requests = 0;
  let normalizedKey = key;
  try { if (/%[a-f0-9]{2}/i.test(key)) normalizedKey = decodeURIComponent(key); } catch { throw new TourError("INVALID_KEY_ENCODING"); }
  return {
    get requests() { return requests; },
    async get(endpoint: string, params: Record<string, string | number>) {
      if (!/^[a-zA-Z]+2$/.test(endpoint)) throw new TourError("INVALID_ENDPOINT");
      const url = new URL(`${BASE}/${endpoint}`);
      const values = { ...params, serviceKey: normalizedKey, MobileOS: "WEB", MobileApp: "WeekendPick", _type: "json" };
      for (const [key, value] of Object.entries(values)) url.searchParams.set(key, String(value));
      for (let attempt = 0; attempt < 3; attempt++) {
        if (Date.now() >= deadline) throw new TourError("TIME_BUDGET_EXHAUSTED");
        if (!await reserve()) throw new TourError("DAILY_BUDGET_EXHAUSTED");
        requests++;
        try {
          const response = await fetcher(url, { signal: AbortSignal.timeout(Math.max(1, Math.min(10_000, deadline - Date.now()))), cache: "no-store" });
          if (!response.ok) {
            if ((response.status === 429 || response.status >= 500) && attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
              continue;
            }
            throw new TourError(`HTTP_${response.status}`);
          }
          try { return parseTourResponse(await response.json()); } catch (error) {
            if (error instanceof TourError) throw error;
            throw new TourError("INVALID_JSON");
          }
        } catch (error) {
          if (error instanceof TourError) throw error;
          if (attempt === 2) throw new TourError("NETWORK_ERROR");
          await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
        }
      }
      throw new TourError("RETRY_EXHAUSTED");
    },
  };
}

export async function syncTourData(repo: Repository, key: string, budget = 500) {
  const today = todayKST(), started = Date.now(), runId = new Date().toISOString();
  const dayBudget = Math.min(800, Math.max(1, Number.isFinite(budget) ? Math.floor(budget) : 500));
  if (!await repo.acquireSync(runId)) return { status: "already_running", events: 0, places: 0, requests: 0 };
  const stats = { events: 0, places: 0, skipped: 0, deferred: 0, withdrawn: 0, requests: 0, truncatedPages: 0 };
  const api = createTourClient(key, () => repo.takeBudget(`tour:${todayKST()}`, dayBudget, 172800), fetch, started + 240_000);
  try {
    await repo.beginSync(runId);
    await repo.cleanupBudgets();
    const candidates: { item: Item; region: EventItem["region"] }[] = [];
    // Include events that started earlier. Long-running events beyond this lookback
    // need an expanded bootstrap; this bounded MVP is documented in README.
    for (const [code, region] of [["11", "서울"], ["41", "경기"], ["28", "인천"]] as const) {
      for (let page = 1; page <= 5; page++) {
        const hidden = await api.get("areaBasedSyncList2", { showflag: 0, contentTypeId: 15, lDongRegnCd: code, modifiedtime: addDays(today, -7).replaceAll("-", ""), numOfRows: 100, pageNo: page });
        for (const item of hidden.items) { await repo.withdrawEvent(String(item.contentid)); stats.withdrawn++; }
        if (page * 100 >= hidden.total || !hidden.items.length) break;
        if (page === 5) stats.truncatedPages++;
      }
      for (let page = 1; page <= 10; page++) {
        const result = await api.get("searchFestival2", { eventStartDate: addDays(today, -365).replaceAll("-", ""), eventEndDate: addDays(today, 28).replaceAll("-", ""), lDongRegnCd: code, numOfRows: 100, pageNo: page, arrange: "C" });
        candidates.push(...result.items.filter(i => tourDate(i.eventenddate) >= today && tourDate(i.eventstartdate) <= addDays(today, 28)).map(item => ({ item, region })));
        if (page * 100 >= result.total || !result.items.length) break;
        if (page === 10) stats.truncatedPages++;
      }
    }
    const unique = [...new Map(candidates.map(c => [String(c.item.contentid), c])).values()];
    const existing = unique.length ? await repo.events(undefined, unique.map(c => String(c.item.contentid))) : [];
    const lastChecked = new Map(existing.map(e => [e.id, e.checkedAt]));
    unique.sort((a, b) => (lastChecked.get(String(a.item.contentid)) ?? "").localeCompare(lastChecked.get(String(b.item.contentid)) ?? ""));
    for (const candidate of unique) {
      if (Date.now() - started > 230_000 || stats.events >= 60) { stats.deferred++; continue; }
      const id = String(candidate.item.contentid);
      if (checkedDateKST(lastChecked.get(id) ?? "") === today) { stats.skipped++; continue; }
      const common = await api.get("detailCommon2", { contentId: id });
      const intro = await api.get("detailIntro2", { contentId: id, contentTypeId: 15 });
      const event = normalizeEvent(candidate.item, common.items[0] ?? {}, intro.items[0] ?? {}, candidate.region);
      if (!event) { stats.skipped++; continue; }
      await repo.upsertEvent(event);
      stats.events++;
      if (event.lat !== null && event.lng !== null) {
        for (const contentTypeId of [12, 14]) {
          const nearby = await api.get("locationBasedList2", { mapX: event.lng, mapY: event.lat, radius: 5000, contentTypeId, numOfRows: 6, pageNo: 1, arrange: "E" });
          for (const item of nearby.items) { const place = normalizePlace(item); if (place) { await repo.upsertPlace(place); stats.places++; } }
        }
      }
    }
    stats.requests = api.requests;
    await repo.endSync(runId, "success", stats, null);
    return { status: "success", ...stats };
  } catch (error) {
    stats.requests = api.requests;
    const code = error instanceof TourError ? error.code : "SYNC_FAILED";
    await repo.endSync(runId, "failed", stats, code);
    throw new TourError(code);
  } finally { await repo.releaseSync(runId); }
}
