import { z } from "zod";

export const regions = ["전체", "서울", "경기", "인천"] as const;
export const categories = ["전체", "자연·산책", "전시·문화", "공연·축제", "먹거리"] as const;
export type Region = typeof regions[number];
export type Category = typeof categories[number];

export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export const dateSchema = z.string().refine(isDate, "올바른 날짜를 선택해 주세요.");
export function todayKST(now = new Date()): string {
  return new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}
export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function nextSaturday(today = todayKST()): string {
  const day = new Date(`${today}T00:00:00Z`).getUTCDay();
  return addDays(today, (6 - day + 7) % 7);
}
export function formatDate(date: string, year = false): string {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
export function shortDate(date: string): string {
  return date.slice(5).replace("-", ".");
}
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (n: number) => n * Math.PI / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function districtFromAddress(address: string): string {
  const parts = address.trim().split(/\s+/).filter(Boolean);
  const cityOrDistrict = parts[1] ?? parts[0] ?? "";
  const district = parts[2] ?? "";
  return cityOrDistrict.endsWith("시") && district.endsWith("구") ? `${cityOrDistrict} ${district}` : cityOrDistrict;
}

export interface EventItem {
  id: string;
  title: string;
  subtitle: string;
  region: Exclude<Region, "전체">;
  district: string;
  category: Exclude<Category, "전체">;
  startDate: string;
  endDate: string;
  address: string;
  lat: number | null;
  lng: number | null;
  description: string;
  price: string;
  hours: string;
  image: string | null;
  imageCredit: string;
  sourceUrl: string;
  sourceName: string;
  checkedAt: string;
  status: "scheduled" | "cancelled" | "withdrawn";
  demo: boolean;
}
export interface PlaceItem {
  id: string;
  title: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  hours: string;
  description: string;
  sourceUrl: string;
  demo: boolean;
}
export interface Filters {
  date: string;
  region: Region;
  district: string;
  category: Category;
  sort: "recommended" | "date";
}
export const filtersSchema = z.object({
  date: dateSchema.default(() => nextSaturday()),
  region: z.enum(regions).default("전체"),
  district: z.string().trim().max(40).default("전체"),
  category: z.enum(categories).default("전체"),
  sort: z.enum(["recommended", "date"]).default("recommended"),
});
export function recommend(events: EventItem[], filters: Filters): EventItem[] {
  const pool = [...new Map(events.map(e => [e.id, e])).values()].filter(e => e.status === "scheduled" && isFresh(e) && e.startDate <= filters.date && e.endDate >= filters.date &&
    (filters.region === "전체" || e.region === filters.region) &&
    (filters.district === "전체" || e.district === filters.district) &&
    (filters.category === "전체" || e.category === filters.category))
    .sort((a, b) => filters.sort === "date" ? a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id) : quality(b) - quality(a));
  if (filters.sort === "date") return pool;
  const picks: EventItem[] = [];
  while (pool.length && picks.length < 3) {
    let index = pool.findIndex(e => picks.every(p => p.category !== e.category && p.region !== e.region));
    if (index < 0) index = pool.findIndex(e => picks.every(p => p.category !== e.category));
    picks.push(pool.splice(Math.max(0, index), 1)[0]);
  }
  return [...picks, ...pool];
}
function quality(e: EventItem): number {
  return Number(Boolean(e.description)) * 2 + Number(Boolean(e.hours)) + Number(Boolean(e.price)) + Number(Boolean(e.sourceUrl));
}
export function recommendationReason(event: EventItem, filters: Filters): string {
  if (event.status !== "scheduled") return "현재 추천이 중단된 행사예요";
  if (filters.date > event.endDate) return "개최 기간이 지난 행사예요";
  if (filters.date < event.startDate) return "아직 시작 전인 행사예요";
  if (!isFresh(event)) return "최신 정보 확인이 필요한 행사예요";
  return filters.category !== "전체" ? `${event.category} 취향에 맞는 나들이` : `${formatDate(filters.date)}에 만날 수 있어요`;
}
export function isFresh(event: EventItem): boolean {
  return event.demo || checkedDateKST(event.checkedAt) >= addDays(todayKST(), -7);
}
export function checkedDateKST(value: string): string {
  if (isDate(value)) return value;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? todayKST(date) : "";
}
export function mapUrl(place: { title: string; address: string; lat: number | null; lng: number | null }): string {
  if (place.lat !== null && place.lng !== null) return `https://map.kakao.com/link/map/${encodeURIComponent(place.title)},${place.lat},${place.lng}`;
  return `https://map.kakao.com/link/search/${encodeURIComponent(`${place.title} ${place.address}`)}`;
}
export function safeUrl(value: string): string {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : ""; } catch { return ""; }
}
export const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const planSchema = z.object({
  eventId: idSchema,
  placeIds: z.array(idSchema).max(2).refine(ids => new Set(ids).size === ids.length, "중복된 장소입니다."),
  date: dateSchema,
}).strict();
export type PlanInput = z.infer<typeof planSchema>;
export interface SharedPlan extends PlanInput { id: string; createdAt: string; }
