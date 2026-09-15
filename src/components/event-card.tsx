"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Bookmark, Check, MapPin } from "lucide-react";
import { shortDate, recommendationReason, type EventItem, type Filters } from "@/lib/domain";
import { useSaved } from "./saved-store";

export function EventPhoto({ event, priority = false }: { event: EventItem; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  return event.image && !failed ? <Image src={event.image} alt={event.demo ? `${event.category} 분위기 참고 이미지` : event.title} fill sizes="(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw" className={event.demo ? "event-photo" : "event-photo source-photo"} priority={priority} onError={() => setFailed(true)} /> : <div className="photo-placeholder"><FlowerPlaceholder /><span>{event.category}</span><small>사진을 준비하고 있어요</small></div>;
}
function FlowerPlaceholder() { return <span className="placeholder-flower" aria-hidden>✳</span>; }
export function SaveButton({ event, large = false }: { event: EventItem; large?: boolean }) {
  const { ids, toggle } = useSaved();
  const saved = ids.includes(event.id);
  const [error, setError] = useState(false);
  return <div className={large ? "save-control" : "card-save"}>
    <button className={large ? "button button-secondary" : "icon-button save-button"} type="button" aria-label={`${event.title} ${saved ? "저장 취소" : "저장"}`} aria-pressed={saved} onClick={() => setError(!toggle(event.id))}>
      <Bookmark size={large ? 18 : 19} fill={saved ? "currentColor" : "none"} strokeWidth={1.7} aria-hidden />{large ? saved ? "저장했어요" : "저장하기" : null}
    </button>
    {error ? <span role="alert" className="save-error">저장 공간을 확인해 주세요.</span> : null}
  </div>;
}
export function EventCard({ event, filters, index = 0 }: { event: EventItem; filters: Filters; index?: number }) {
  return <article className="event-card" data-testid="event-card">
    <div className="event-image-wrap">
      <Link href={`/events/${event.id}?date=${filters.date}`} tabIndex={-1} aria-hidden="true" className="event-image-link"><EventPhoto event={event} priority={index < 3} /></Link>
      <span className="photo-category">{event.category}</span>
      <SaveButton event={event} />
      {event.demo ? <span className="photo-disclaimer">분위기 참고 이미지</span> : null}
    </div>
    <div className="event-location"><MapPin size={13} aria-hidden />{event.region} {event.district}<span>{event.demo ? "예시 행사" : "TourAPI"}</span></div>
    <Link className="event-title-link" href={`/events/${event.id}?date=${filters.date}`}><h3>{event.title}</h3><ArrowUpRight size={20} strokeWidth={1.4} aria-hidden /></Link>
    <p className="event-subtitle">{event.subtitle}</p>
    <div className="event-meta"><span>{shortDate(event.startDate)} — {shortDate(event.endDate)}</span><span>{event.price || "요금 확인 필요"}</span></div>
    <div className="event-reason"><Check size={13} aria-hidden />{recommendationReason(event, filters)}</div>
  </article>;
}
