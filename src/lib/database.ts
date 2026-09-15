import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { distanceKm, type EventItem, type Filters, type PlaceItem, type PlanInput, type SharedPlan } from "./domain";

export type Query = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
export function neonQuery(): Query {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const sql = neon(process.env.DATABASE_URL);
  return async (text, params = []) => await sql.query(text, params) as Record<string, unknown>[];
}

export function createRepository(query: Query) {
  return {
    async events(filters?: Filters, ids?: string[]): Promise<EventItem[]> {
      const rows = ids
        ? await query("SELECT data FROM wp_events WHERE id = ANY($1::text[])", [ids])
        : filters
          ? await query("SELECT data FROM wp_events WHERE start_date <= $1::date AND end_date >= $1::date AND status = 'scheduled' AND ($2 = '전체' OR region = $2) AND ($3 = '전체' OR category = $3) ORDER BY id LIMIT 200", [filters.date, filters.region, filters.category])
          : await query("SELECT data FROM wp_events ORDER BY start_date DESC LIMIT 200");
      return rows.map(r => r.data as EventItem);
    },
    async event(id: string): Promise<EventItem | null> {
      const rows = await query("SELECT data FROM wp_events WHERE id = $1", [id]);
      return (rows[0]?.data as EventItem | undefined) ?? null;
    },
    async places(ids: string[]): Promise<PlaceItem[]> {
      if (!ids.length) return [];
      const rows = await query("SELECT data FROM wp_places WHERE id = ANY($1::text[])", [ids]);
      const items = rows.map(r => r.data as PlaceItem);
      return ids.flatMap(id => items.find(p => p.id === id) ?? []);
    },
    async nearby(event: EventItem): Promise<PlaceItem[]> {
      if (event.lat === null || event.lng === null) return [];
      const rows = await query("SELECT data FROM wp_places WHERE lat BETWEEN $1 AND $2 AND lng BETWEEN $3 AND $4 LIMIT 300", [event.lat - 0.08, event.lat + 0.08, event.lng - 0.1, event.lng + 0.1]);
      const point = { lat: event.lat, lng: event.lng };
      return rows.map(r => r.data as PlaceItem).filter(p => distanceKm(point, p) <= 5).sort((a, b) => distanceKm(point, a) - distanceKm(point, b)).slice(0, 6);
    },
    async upsertEvent(e: EventItem) {
      await query("INSERT INTO wp_events (id, start_date, end_date, region, category, status, data) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT(id) DO UPDATE SET start_date=EXCLUDED.start_date,end_date=EXCLUDED.end_date,region=EXCLUDED.region,category=EXCLUDED.category,status=EXCLUDED.status,data=EXCLUDED.data,updated_at=now()", [e.id, e.startDate, e.endDate, e.region, e.category, e.status, JSON.stringify(e)]);
    },
    async upsertPlace(p: PlaceItem) {
      await query("INSERT INTO wp_places (id, lat, lng, data) VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT(id) DO UPDATE SET lat=EXCLUDED.lat,lng=EXCLUDED.lng,data=EXCLUDED.data,updated_at=now()", [p.id, p.lat, p.lng, JSON.stringify(p)]);
    },
    async withdrawEvent(id: string) {
      await query("UPDATE wp_events SET status='withdrawn', data=jsonb_set(data,'{status}','\"withdrawn\"'::jsonb),updated_at=now() WHERE id=$1", [id]);
    },
    async createPlan(input: PlanInput): Promise<SharedPlan> {
      const id = randomUUID();
      const rows = await query("INSERT INTO wp_shared_plans (id,event_id,place_ids,visit_date) VALUES ($1,$2,$3::jsonb,$4) RETURNING created_at", [id, input.eventId, JSON.stringify(input.placeIds), input.date]);
      return { ...input, id, createdAt: new Date(rows[0].created_at as string).toISOString() };
    },
    async plan(id: string): Promise<SharedPlan | null> {
      const rows = await query("SELECT id,event_id,place_ids,visit_date::text,created_at FROM wp_shared_plans WHERE id=$1", [id]);
      if (!rows.length) return null;
      const row = rows[0];
      return { id: String(row.id), eventId: String(row.event_id), placeIds: row.place_ids as string[], date: String(row.visit_date), createdAt: new Date(row.created_at as string).toISOString() };
    },
    async takeBudget(key: string, limit: number, ttlSeconds: number): Promise<boolean> {
      const rows = await query("INSERT INTO wp_budgets (key,count,expires_at) VALUES ($1,1,now()+$3*interval '1 second') ON CONFLICT(key) DO UPDATE SET count=wp_budgets.count+1 WHERE wp_budgets.count < $2 RETURNING count", [key, limit, ttlSeconds]);
      return rows.length > 0;
    },
    async cleanupBudgets() { await query("DELETE FROM wp_budgets WHERE expires_at < now()"); },
    async acquireSync(owner: string): Promise<boolean> {
      const rows = await query("INSERT INTO wp_sync_locks(key,owner,expires_at) VALUES('tour',$1,now()+interval '10 minutes') ON CONFLICT(key) DO UPDATE SET owner=EXCLUDED.owner,expires_at=EXCLUDED.expires_at WHERE wp_sync_locks.expires_at < now() RETURNING owner", [owner]);
      return rows.length > 0;
    },
    async releaseSync(owner: string) { await query("DELETE FROM wp_sync_locks WHERE key='tour' AND owner=$1", [owner]); },
    async beginSync(id: string): Promise<boolean> {
      const rows = await query("INSERT INTO wp_sync_runs(id,status,started_at) VALUES($1,'running',now()) ON CONFLICT DO NOTHING RETURNING id", [id]);
      return rows.length > 0;
    },
    async endSync(id: string, status: string, stats: Record<string, number>, error: string | null) {
      await query("UPDATE wp_sync_runs SET status=$2,finished_at=now(),stats=$3::jsonb,error=$4 WHERE id=$1", [id, status, JSON.stringify(stats), error]);
    },
  };
}
export type Repository = ReturnType<typeof createRepository>;
