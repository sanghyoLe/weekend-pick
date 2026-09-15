import assert from "node:assert/strict";
import { test } from "node:test";
import { demoEvents } from "../src/lib/demo";
import { buildPost, highlights, pick, render, visitDays } from "../src/lib/editorial";

const base = { ...demoEvents()[0], demo: false, id: "1", startDate: "2026-09-12", endDate: "2026-09-13", sourceUrl: "https://example.org/", hours: "10:00~18:00", price: "무료", checkedAt: "2026-09-11T00:00:00Z" };

test("editorial: weekend visit days, selection, highlights, escaping", () => {
  assert.deepEqual(visitDays(base, "2026-09-11"), ["2026-09-12", "2026-09-13"]);   // 금요일 → 다가오는 주말
  assert.deepEqual(visitDays(base, "2026-09-13"), []);                             // 일요일 → 다음 주말 (끝난 주말 추천 안 함)
  assert.deepEqual(visitDays({ ...base, endDate: "2026-09-12" }, "2026-09-12"), ["2026-09-12"]);
  const rich = { ...base, id: "2", description: "요약 문장이다. 공연 〈신명마당〉, 장인의 손끝 〈솜씨마당〉이 열린다." };
  assert.deepEqual(highlights(rich.description).map(h => h.name), ["신명마당", "솜씨마당"]);
  assert.equal(pick([base, rich], "2026-09-11")?.id, "2");                          // 프로그램 표기 많은 쪽
  assert.equal(pick([base, rich], "2026-09-11", ["2"])?.id, "1");                   // 최근 게시 제외
  assert.equal(pick([{ ...base, demo: true }], "2026-09-11"), null);
  const post = buildPost({ ...rich, title: "<b>x</b>" }, "2026-09-11");
  assert.equal(post.vars.title, "&lt;b&gt;x&lt;/b&gt;");
  assert.match(render("<h1>{{title}}</h1>{{none}}", post.vars), /^<h1>&lt;b&gt;x&lt;\/b&gt;<\/h1>$/);
  assert.match(post.caption, /9월 12일 토 ~ 2026년 9월 13일 일/);
});
