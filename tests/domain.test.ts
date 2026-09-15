import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, checkedDateKST, distanceKm, filtersSchema, isDate, nextSaturday, planSchema, recommend, safeUrl, todayKST } from "../src/lib/domain";
import { demoEvents } from "../src/lib/demo";
import { decodeDemoPlan, encodeDemoPlan } from "../src/lib/sharing";

test("dates use Korea's calendar across midnight and leap days", () => {
  assert.equal(todayKST(new Date("2026-09-11T15:01:00Z")), "2026-09-12");
  assert.equal(nextSaturday("2026-09-12"), "2026-09-12");
  assert.equal(nextSaturday("2026-09-13"), "2026-09-19");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(isDate("2026-02-29"), false);
  assert.equal(isDate("2026-13-01"), false);
  assert.equal(isDate("2026-9-01"), false);
  assert.equal(checkedDateKST("2026-09-11T20:00:00Z"), "2026-09-12");
  assert.equal(checkedDateKST("invalid"), "");
});
test("recommendations include overlapping dates and exclude wrong regions, interests and cancelled events", () => {
  const base = demoEvents()[0];
  const events = [
    { ...base, id: "valid", startDate: "2026-09-01", endDate: "2026-09-12" },
    { ...base, id: "expired", startDate: "2026-09-01", endDate: "2026-09-11" },
    { ...base, id: "cancelled", startDate: "2026-09-01", endDate: "2026-09-30", status: "cancelled" as const },
    { ...base, id: "other-region", startDate: "2026-09-01", endDate: "2026-09-30", region: "경기" as const },
    { ...base, id: "other-category", startDate: "2026-09-01", endDate: "2026-09-30", category: "먹거리" as const },
  ];
  assert.deepEqual(recommend(events, { date: "2026-09-12", region: "서울", category: "자연·산책", sort: "recommended" }).map(e => e.id), ["valid"]);
  assert.equal(filtersSchema.safeParse({ date: "not-a-date" }).success, false);
  assert.equal(recommend([{ ...base, demo: false, checkedAt: "2000-01-01" }], { date: nextSaturday(), region: "전체", category: "전체", sort: "recommended" }).length, 0);
});
test("share data only accepts bounded, unique place IDs and roundtrips", () => {
  const input = { eventId: "demo-forest", placeIds: ["demo-seoul-walk"], date: "2026-09-12" };
  assert.deepEqual(decodeDemoPlan(encodeDemoPlan(input)), input);
  assert.equal(decodeDemoPlan("d." + "A".repeat(701)), null);
  assert.equal(decodeDemoPlan("d.invalid"), null);
  assert.equal(planSchema.safeParse({ ...input, placeIds: ["a", "a"] }).success, false);
  assert.equal(planSchema.safeParse({ ...input, placeIds: ["a", "b", "c"] }).success, false);
  assert.equal(planSchema.safeParse({ ...input, title: "untrusted title" }).success, false);
});
test("distance and outbound URL handling", () => {
  assert.equal(distanceKm({ lat: 37, lng: 127 }, { lat: 37, lng: 127 }), 0);
  assert.ok(distanceKm({ lat: 37, lng: 127 }, { lat: 37.01, lng: 127 }) > 1);
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("https://user:password@example.com"), "");
  assert.equal(safeUrl("https://example.com/festival"), "https://example.com/festival");
});
