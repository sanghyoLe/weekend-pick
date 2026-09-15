import assert from "node:assert/strict";
import { test } from "node:test";
import { createTourClient, normalizeEvent, parseTourResponse, plainText, TourError } from "../src/lib/tour-api";

const success = (items: unknown, totalCount = 1) => ({ response: { header: { resultCode: "0000" }, body: { items: { item: items }, totalCount } } });
test("TourAPI handles singleton, empty and invalid responses", () => {
  assert.equal(parseTourResponse(success({ contentid: "1" })).items.length, 1);
  assert.equal(parseTourResponse(success([], 0)).items.length, 0);
  assert.equal(parseTourResponse({ response: { header: { resultCode: "0000" }, body: { items: "", totalCount: 0 } } }).items.length, 0);
  assert.throws(() => parseTourResponse({ response: { header: { resultCode: "30" } } }), TourError);
});
test("normalization keeps missing prices unknown and rejects malformed dates", () => {
  const raw = { contentid: "123", title: "테스트 전시", addr1: "서울 종로구 테스트로", eventstartdate: "20260912", eventenddate: "20260915", mapx: "126.9", mapy: "37.5" };
  const event = normalizeEvent(raw, { overview: "<p>소개</p><script>alert(1)</script>", homepage: '<a href="javascript:alert(1)">x</a>', firstimage: "https://evil.example/image.svg" }, {}, "서울");
  assert.equal(event?.price, "");
  assert.equal(event?.image, null);
  assert.equal(event?.description, "소개");
  assert.equal(event?.category, "전시·문화");
  assert.equal(event?.demo, false);
  assert.equal(normalizeEvent({ ...raw, addr1: "경기도 수원시 팔달구 정조로 825" }, {}, {}, "경기")?.district, "수원시 팔달구");
  assert.equal(normalizeEvent({ ...raw, eventstartdate: "20260230" }, {}, {}, "서울"), null);
  assert.equal(normalizeEvent({ ...raw, eventenddate: "20260901" }, {}, {}, "서울"), null);
  assert.equal(plainText("A<br>B &amp; C"), "A\nB & C");
});
test("request key is encoded once and every retry reserves budget", async () => {
  let reserved = 0, called = 0;
  const api = createTourClient("a%2Bb%3D", async () => { reserved++; return true; }, (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get("serviceKey"), "a+b=");
    assert.equal(url.pathname, "/B551011/KorService2/searchFestival2");
    called++;
    return called === 1 ? new Response("unavailable", { status: 503 }) : Response.json(success([], 0));
  }) as typeof fetch);
  await api.get("searchFestival2", { pageNo: 1 });
  assert.equal(reserved, 2); assert.equal(api.requests, 2);
});
test("exhausted budget makes no network call; auth errors are not retried", async () => {
  let called = 0;
  const blocked = createTourClient("key", async () => false, (async () => { called++; return Response.json(success([])); }) as typeof fetch);
  await assert.rejects(blocked.get("searchFestival2", {}), /DAILY_BUDGET_EXHAUSTED/);
  assert.equal(called, 0);
  const invalid = createTourClient("key", async () => true, (async () => { called++; return Response.json({ response: { header: { resultCode: "30" } } }); }) as typeof fetch);
  await assert.rejects(invalid.get("searchFestival2", {}), /30/);
  assert.equal(called, 1);
});
