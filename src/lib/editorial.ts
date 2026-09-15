import { addDays, formatDate, nextSaturday, shortDate, type EventItem } from "./domain";

export interface Post {
  eventId: string;
  publishDate: string;
  visitDays: string[];
  vars: Record<string, string>;
  caption: string;
}

export function weekendFor(today: string): [string, string] {
  const sat = nextSaturday(today); // ponytail: 토요일은 당일, 일요일은 다음 주말로 넘어감 (nextSaturday 규칙)
  return [sat, addDays(sat, 1)];
}

export function visitDays(e: EventItem, today: string): string[] {
  return weekendFor(today).filter(d => e.startDate <= d && d <= e.endDate);
}

/** 원문 〈프로그램〉 표기와 그 앞 수식구를 볼거리로 추출. 없으면 빈 배열. */
export function highlights(text: string): { name: string; lead: string }[] {
  const out: { name: string; lead: string }[] = [];
  for (const m of text.matchAll(/([^.,〉]*?)\s*〈([^〉]{1,20})〉/g)) {
    out.push({ name: m[2].trim(), lead: m[1].replace(/^[^가-힣A-Za-z]+/, "").trim() });
  }
  return out;
}

export function pick(events: EventItem[], today: string, recentIds: string[] = []): EventItem | null {
  const ok = events.filter(e => !e.demo && e.status === "scheduled" && e.title && e.address && e.sourceUrl && e.hours && e.price
    && !recentIds.includes(e.id) && visitDays(e, today).length > 0);
  // ponytail: 프로그램 충실도 = 〈〉 표기 개수, 출처는 공식 URL 우선. 지역·주제 다양성은 게시 이력 쌓이면 추가
  const score = (e: EventItem) => [visitDays(e, today).length, e.sourceUrl.includes("visitkorea.or.kr/search") ? 0 : 1, Math.min(highlights(e.description).length, 5)];
  ok.sort((a, b) => { const x = score(a), y = score(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return y[i] - x[i]; return a.id.localeCompare(b.id); });
  return ok[0] ?? null;
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const sentences = (t: string) => t.split(/(?<=[.다]\.?)\s+/).map(s => s.trim()).filter(Boolean);
const ga = (w: string) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? "이" : "가"; };
const dayRange = (days: string[]) => days.map(d => formatDate(d)).join(" · ");

export function buildPost(e: EventItem, today: string): Post {
  const days = visitDays(e, today);
  const hl = highlights(e.description);
  const sent = sentences(e.description);
  const main = hl.slice(0, 3);
  const rest = hl.slice(3);
  const period = e.startDate === e.endDate ? formatDate(e.startDate, true) : `${formatDate(e.startDate, true)} ~ ${formatDate(e.endDate, true)}`;
  const checked = e.checkedAt.slice(0, 10);
  const vars: Record<string, string> = {
    region: esc(`${e.region} ${e.district}`),
    title: esc(e.title),
    weekendLabel: esc(days.length === 2 ? "이번 주말" : `이번 ${formatDate(days[0]).slice(-3, -1)}요일`),
    weekendDays: esc(dayRange(days)),
    weekendShort: esc(days.map(shortDate).join("\n")),
    price: esc(e.price),
    hours: esc(e.hours),
    period: esc(period),
    address: esc(e.address),
    reason: esc(sent[0] ?? ""),
    highlights: main.length ? main.map((h, i) => `<li><b>${i + 1}</b><div><strong>${esc(h.name)}</strong><span>${esc(h.lead)}</span></div></li>`).join("") : sent.slice(1, 4).map((s, i) => `<li><b>${i + 1}</b><div><span>${esc(s)}</span></div></li>`).join(""),
    // ponytail: 주변 장소는 운영시간·소개 근거가 없어 3번 카드는 항상 프로그램 소개. 장소 데이터 검증되면 분기 추가
    card3Title: rest.length ? "이런 프로그램도" : "행사 안내",
    card3Body: rest.length ? `<ul class="list">${rest.map((h, i) => `<li><b>${main.length + i + 1}</b><div><strong>${esc(h.name)}</strong><span>${esc(h.lead)}</span></div></li>`).join("")}</ul><p class="prose" style="font-size:32px;color:var(--ink-2)">${esc(sent[1] ?? "")}</p>`
      : `<p class="prose">${(sent.length > 4 ? sent.slice(4, 7) : [e.endDate <= days[days.length - 1] ? `행사는 ${formatDate(e.endDate)}에 끝나요. 이번 주말이 마지막 기회예요.` : `행사 기간 중 ${e.hours}에 열려요. 방문일 운영 여부는 공식 안내에서 확인해 주세요.`]).map(esc).join(" ")}</p>`,
    photo: e.image ? "photo.jpg" : "",
    photoClass: e.image ? "has" : "",
    bigDisplay: e.image ? "none" : "block",
    photoCredit: esc(e.image ? `사진: ${e.imageCredit} · 원본 그대로 사용` : ""),
    sourceName: esc(e.sourceName),
    sourceHost: esc(new URL(e.sourceUrl).host),
    checked: esc(checked),
  };
  const caption = [
    `${days.length === 2 ? "이번 주말" : formatDate(days[0])}, ${e.region} ${e.district}에서 ${e.title}${ga(e.title)} 열립니다.`,
    "",
    `📅 ${period}`,
    `🕐 ${e.hours}`,
    `💸 ${e.price}`,
    `📍 ${e.address}`,
    "",
    "요금·운영시간·예약 여부는 방문 전 공식 안내에서 다시 확인해 주세요. 프로그램은 현장 사정으로 바뀔 수 있어요.",
    "",
    `정보 출처: ${e.sourceName} (${checked} 확인) · 원문 ${e.sourceUrl}`,
    ...(e.image ? [`사진 출처: ${e.imageCredit}`] : []),
    "",
    "같이 갈 사람에게 공유하고, 나중에 볼 수 있게 저장해 두세요.",
    "",
    `#주말픽 #${e.region}나들이 #${e.district.replace(/\s/g, "")} #주말데이트 #${e.category.replace("·", "")}`,
  ].join("\n");
  return { eventId: e.id, publishDate: today, visitDays: days, vars, caption };
}

export function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}
