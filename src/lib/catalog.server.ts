import "server-only";
import { cache } from "react";
import { demoEvents, demoPlaces } from "./demo";
import { createRepository, neonQuery } from "./database";
import { districtFromAddress, distanceKm, recommend, type DistrictOption, type EventItem, type Filters } from "./domain";

export const isDemo = () => process.env.DATA_MODE === "demo" || !process.env.DATABASE_URL;
export const repository = () => createRepository(neonQuery());
const withDistrict = (event: EventItem): EventItem => ({ ...event, district: districtFromAddress(event.address) || event.district });
export async function getEvents(filters?: Filters, ids?: string[]) {
  const events = isDemo() ? demoEvents().filter(e => !ids || ids.includes(e.id)).map(withDistrict) : await repository().events(filters, ids);
  return filters && !ids ? recommend(events, filters) : events;
}
export async function getDistricts(): Promise<DistrictOption[]> {
  if (isDemo()) return [...new Map(demoEvents().map(withDistrict).map(({ region, district }) => [`${region}:${district}`, { region, district }])).values()].sort((a, b) => a.district.localeCompare(b.district, "ko"));
  return repository().districts();
}
export const getEvent = cache(async (id: string) => isDemo() ? demoEvents().filter(e => e.id === id).map(withDistrict)[0] ?? null : repository().event(id));
export async function getNearby(event: EventItem) {
  if (!isDemo()) return repository().nearby(event);
  if (event.lat === null || event.lng === null) return [];
  const center = { lat: event.lat, lng: event.lng };
  return demoPlaces.filter(p => distanceKm(center, p) <= 5).sort((a, b) => distanceKm(center, a) - distanceKm(center, b)).slice(0, 6);
}
