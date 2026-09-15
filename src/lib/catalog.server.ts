import "server-only";
import { cache } from "react";
import { demoEvents, demoPlaces } from "./demo";
import { createRepository, neonQuery } from "./database";
import { distanceKm, recommend, type EventItem, type Filters } from "./domain";

export const isDemo = () => process.env.DATA_MODE === "demo" || !process.env.DATABASE_URL;
export const repository = () => createRepository(neonQuery());
export async function getEvents(filters?: Filters, ids?: string[]) {
  const events = isDemo() ? demoEvents().filter(e => !ids || ids.includes(e.id)) : await repository().events(filters, ids);
  return filters && !ids ? recommend(events, filters) : events;
}
export const getEvent = cache(async (id: string) => isDemo() ? demoEvents().find(e => e.id === id) ?? null : repository().event(id));
export async function getNearby(event: EventItem) {
  if (!isDemo()) return repository().nearby(event);
  if (event.lat === null || event.lng === null) return [];
  const center = { lat: event.lat, lng: event.lng };
  return demoPlaces.filter(p => distanceKm(center, p) <= 5).sort((a, b) => distanceKm(center, a) - distanceKm(center, b)).slice(0, 6);
}
