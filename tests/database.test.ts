import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { createRepository } from "../src/lib/database";
import { demoEvents, demoPlaces } from "../src/lib/demo";
import { nextSaturday } from "../src/lib/domain";

test("Postgres schema and repository: filters, upserts, nearby, durable shares, quotas and sync locks", async () => {
  const db = new PGlite();
  try {
    const schema = await readFile(new URL("../db/001_initial.sql", import.meta.url), "utf8");
    await db.exec(schema); await db.exec(schema);
    const repo = createRepository(async (sql, params) => (await db.query<Record<string, unknown>>(sql, params)).rows);
    const events = demoEvents();
    for (const e of events) await repo.upsertEvent(e);
    for (const p of demoPlaces) await repo.upsertPlace(p);
    const filter = { date: nextSaturday(), region: "서울" as const, district: "성동구", category: "자연·산책" as const, sort: "recommended" as const };
    assert.deepEqual((await repo.events(filter)).map(e => e.id), ["demo-forest"]);
    const districtOptions = await repo.districts();
    assert.deepEqual(
      districtOptions.filter(option => option.region === "서울").map(option => option.district),
      ["성동구", "종로구"],
    );
    assert.ok(districtOptions.some(option => option.region === "경기" && option.district === "수원시 팔달구"));
    assert.equal(await repo.event("' OR 1=1 --"), null);
    const forest = events[0];
    await repo.upsertEvent({ ...forest, price: "변경된 요금" });
    assert.equal((await repo.event(forest.id))?.price, "변경된 요금");
    const nearby = await repo.nearby(forest);
    assert.equal(nearby.length, 2);
    assert.deepEqual(await repo.nearby({ ...forest, lat: null }), []);
    const plan = await repo.createPlan({ eventId: forest.id, placeIds: [nearby[1].id, nearby[0].id], date: nextSaturday() });
    const reconnectedRepo = createRepository(async (sql, params) => (await db.query<Record<string, unknown>>(sql, params)).rows);
    const saved = await reconnectedRepo.plan(plan.id);
    assert.deepEqual(saved, plan);
    assert.deepEqual((await repo.places(plan.placeIds)).map(p => p.id), plan.placeIds);
    await assert.rejects(repo.createPlan({ eventId: "does-not-exist", placeIds: [], date: nextSaturday() }));
    const attempts = await Promise.all(Array.from({ length: 8 }, () => repo.takeBudget("test-window", 3, 3600)));
    assert.equal(attempts.filter(Boolean).length, 3);
    assert.equal(await repo.acquireSync("first"), true);
    assert.equal(await repo.acquireSync("second"), false);
    await repo.releaseSync("second");
    assert.equal(await repo.acquireSync("third"), false);
    await repo.releaseSync("first");
    assert.equal(await repo.acquireSync("third"), true);
    await repo.beginSync("run-1"); await repo.endSync("run-1", "success", { events: 6 }, null);
    assert.equal((await db.query<{ status: string }>("SELECT status FROM wp_sync_runs")).rows[0].status, "success");
    await repo.withdrawEvent(forest.id);
    assert.equal((await repo.event(forest.id))?.status, "withdrawn");
    assert.equal((await repo.events(filter)).length, 0);
  } finally { await db.close(); }
});
