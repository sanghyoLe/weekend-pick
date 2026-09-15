"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, ChevronDown, Compass, Leaf, MapPin, Music2, Palette, Search, Utensils, X } from "lucide-react";
import { addDays, categories, formatDate, nextSaturday, regions, todayKST, type Category, type EventItem, type Filters } from "@/lib/domain";
import { EventCard } from "./event-card";
const categoryIcons = { "전체": Compass, "자연·산책": Leaf, "전시·문화": Palette, "공연·축제": Music2, "먹거리": Utensils };

export function Explorer({ events, filters, error }: { events: EventItem[]; filters: Filters; error?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(filters.date);
  const [region, setRegion] = useState(filters.region);
  const [visible, setVisible] = useState(3);
  const today = todayKST();
  const saturday = nextSaturday(today);
  const navigate = (values: Partial<Filters>) => {
    const next = { ...filters, date, region, ...values };
    const params = new URLSearchParams(next);
    startTransition(() => router.push(`/?${params}`, { scroll: false }));
  };
  const chooseCategory = (category: Category) => navigate({ category });
  const selectedWeekend = date === saturday ? "토요일" : date === addDays(saturday, 1) ? "일요일" : "선택한 날";
  return <>
    <section className="discovery-intro" aria-labelledby="discovery-title">
      <div><p className="intro-note">멀리 가지 않아도 괜찮아요.</p><h1 id="discovery-title">이번 주말,<br className="mobile-break" /> 어디로 가볼까요?</h1><p className="intro-description">마음에 드는 행사 하나, 함께 들를 곳 두어 곳.<br className="mobile-break" /> 가벼운 나들이를 골라 보세요.</p></div>
      <div className="weekend-stamp" aria-hidden><span>WEEKEND</span><strong>{date.slice(5).replace("-", "/")}</strong><span>{selectedWeekend}의 빈칸을 채워요</span><div className="stamp-stars">✳</div></div>
    </section>
    <section className="search-section" aria-label="나들이 검색">
      <form className="search-bar" onSubmit={e => { e.preventDefault(); navigate({}); }}>
        <label className="search-field"><CalendarDays size={20} strokeWidth={1.4} aria-hidden /><span><span className="field-label">언제 떠날까요?</span><input aria-label="나들이 날짜" type="date" min={today} max={addDays(today, 90)} required value={date} onChange={e => setDate(e.target.value)} /></span></label>
        <label className="search-field"><MapPin size={21} strokeWidth={1.4} aria-hidden /><span><span className="field-label">어디로 갈까요?</span><span className="select-wrap"><select aria-label="방문 지역" value={region} onChange={e => setRegion(e.target.value as Filters["region"])}>{regions.map(r => <option key={r} value={r}>{r === "전체" ? "수도권 어디든" : r}</option>)}</select><ChevronDown size={14} aria-hidden /></span></span></label>
        <button className="button button-primary search-submit" disabled={pending} type="submit"><Search size={17} aria-hidden />{pending ? "찾고 있어요" : "나들이 찾기"}<ArrowRight size={17} aria-hidden /></button>
      </form>
      <div className="date-shortcuts"><span>가볍게 골라요</span><button type="button" aria-pressed={date === saturday} onClick={() => { setDate(saturday); navigate({ date: saturday }); }}>이번 토요일</button><button type="button" aria-pressed={date === addDays(saturday, 1)} onClick={() => { const d = addDays(saturday, 1); setDate(d); navigate({ date: d }); }}>이번 일요일</button><button type="button" aria-pressed={date === addDays(saturday, 7)} onClick={() => { const d = addDays(saturday, 7); setDate(d); navigate({ date: d }); }}>다음 주말</button></div>
    </section>
    <section className="results-section" aria-labelledby="results-title" aria-busy={pending}>
      <div className="category-tabs" role="group" aria-label="관심사">{categories.map(category => { const Icon = categoryIcons[category]; return <button key={category} type="button" className={filters.category === category ? "selected" : ""} aria-pressed={filters.category === category} disabled={pending} onClick={() => chooseCategory(category)}><Icon size={17} strokeWidth={1.6} aria-hidden />{category === "전체" ? "모든 나들이" : category}</button>; })}</div>
      <div className="results-heading"><div><h2 id="results-title">당신의 주말 후보<span className="result-count">{events.length}</span></h2><p>{formatDate(filters.date)} · {filters.region === "전체" ? "서울·경기·인천" : filters.region}</p></div><label className="sort-control"><span className="sr-only">정렬 기준</span><select value={filters.sort} onChange={e => navigate({ sort: e.target.value as Filters["sort"] })}><option value="recommended">추천순</option><option value="date">시작일순</option></select><ChevronDown size={13} aria-hidden /></label></div>
      <p className="sr-only" role="status">{pending ? "나들이를 찾고 있어요." : `${events.length}개의 나들이를 찾았어요.`}</p>
      {error ? <div className="empty-state" role="alert"><Compass size={36} strokeWidth={1} /><h3>잠시 쉬었다 다시 만나요</h3><p>{error}</p><button className="button button-secondary" onClick={() => startTransition(() => router.refresh())}>다시 불러오기</button></div> : events.length ? <><div className={`event-grid${pending ? " is-pending" : ""}`}>{events.slice(0, visible).map((event, i) => <EventCard key={event.id} event={event} filters={filters} index={i} />)}</div>{events.length > visible ? <div className="more-row"><button className="button button-secondary" onClick={() => setVisible(v => v + 6)}>다른 나들이도 보기 <span>{events.length - visible}</span><ArrowRight size={16} aria-hidden /></button></div> : null}</> : <div className="empty-state"><Compass size={36} strokeWidth={1} aria-hidden /><h3>이날의 나들이는 아직 준비 중이에요</h3><p>다른 날짜나 지역을 고르면 새로운 후보를 만날 수 있어요.</p><button className="button button-secondary" onClick={() => { setRegion("전체"); navigate({ region: "전체", category: "전체" }); }}><X size={15} aria-hidden />조건 넓혀 보기</button></div>}
    </section>
    <aside className="weekend-note"><div className="note-flower" aria-hidden>✳</div><div><h2>좋은 주말은, 작은 발견에서.</h2><p>마음에 드는 나들이를 저장해 두세요.<br className="mobile-break" /> 다음 약속을 정할 때 꺼내 보기 좋아요.</p></div><span className="note-signature">주말픽 드림</span></aside>
  </>;
}
