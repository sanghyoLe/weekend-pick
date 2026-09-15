"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark } from "lucide-react";
import { nextSaturday, type EventItem } from "@/lib/domain";
import { EventCard } from "./event-card";
import { useSaved } from "./saved-store";

export function SavedList() {
  const { ids } = useSaved();
  const key = ids.join(",");
  const [result, setResult] = useState<{ key: string; events: EventItem[]; error: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/events?ids=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("LOAD_FAILED"); return response.json(); })
      .then(data => setResult({ key, events: data.events, error: false }))
      .catch(() => { if (!controller.signal.aborted) setResult({ key, events: [], error: true }); });
    return () => controller.abort();
  }, [key, retry]);
  if (!ids.length) return <div className="empty-state"><Bookmark size={36} strokeWidth={1} aria-hidden /><h2>다음 주말을 위해, 하나씩 모아 두세요.</h2><p>행사 사진의 저장 버튼을 누르면 이곳에 모여요.<br />저장 목록은 지금 사용하는 브라우저에 보관돼요.</p><Link href="/" className="button button-primary">나들이 발견하기 <ArrowRight size={16} aria-hidden /></Link></div>;
  if (result?.key !== key) return <p role="status" className="loading-message">저장한 나들이를 꺼내고 있어요.</p>;
  if (result.error) return <div className="empty-state" role="alert"><h2>저장한 나들이를 불러오지 못했어요.</h2><button className="button button-secondary" onClick={() => { setResult(null); setRetry(v => v + 1); }}>다시 불러오기</button></div>;
  return <>{result.events.length < ids.length ? <p className="inline-message">현재 제공하지 않는 행사 일부는 표시되지 않을 수 있어요.</p> : null}<div className="event-grid saved-grid">{result.events.map((event, index) => <EventCard key={event.id} event={event} filters={{ date: nextSaturday(), region: "전체", district: "전체", category: "전체", sort: "recommended" }} index={index} />)}</div></>;
}
