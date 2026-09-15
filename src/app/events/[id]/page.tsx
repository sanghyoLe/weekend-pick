import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays, Clock3, MapPin, Ticket } from "lucide-react";
import { getEvent, getNearby } from "@/lib/catalog.server";
import { checkedDateKST, dateSchema, formatDate, nextSaturday } from "@/lib/domain";
import { EventPhoto, SaveButton } from "@/components/event-card";
import { TripPlanner } from "@/components/trip-planner";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const event = await getEvent((await params).id); return { title: event?.title ?? "행사를 찾을 수 없어요" }; }
export default async function EventPage({ params, searchParams }: Props) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const event = await getEvent(id);
  if (!event) notFound();
  const places = await getNearby(event);
  const parsed = dateSchema.safeParse(search.date);
  const date = parsed.success ? parsed.data : nextSaturday();
  const initialIds = (search.places ?? "").split(",").filter(Boolean);
  return <main id="main" className="page-width detail-page">
    <Link className="back-link" href={`/?date=${date}`}><ArrowLeft size={15} aria-hidden />나들이 목록</Link>
    <div className="detail-grid"><article className="detail-content">
      <div className="detail-image"><EventPhoto event={event} priority />{event.demo ? <span className="photo-disclaimer">분위기 참고 이미지 · 실제 행사 사진이 아닙니다</span> : null}</div>
      <div className="detail-kicker"><span>{event.category}</span><span><MapPin size={13} aria-hidden />{event.region} {event.district}</span></div>
      <div className="detail-title-row"><h1>{event.title}</h1><SaveButton event={event} large /></div>
      <p className="detail-subtitle">{event.subtitle}</p>
      {event.demo ? <p className="demo-notice">미리보기용으로 만든 가상의 행사입니다. 실제 개최 일정과 요금이 아니에요.</p> : null}
      <dl className="detail-facts"><div><dt><CalendarDays size={17} aria-hidden />일정</dt><dd>{formatDate(event.startDate)} — {formatDate(event.endDate)}</dd></div><div><dt><Clock3 size={17} aria-hidden />운영시간</dt><dd>{event.hours || "운영시간 확인 필요"}</dd></div><div><dt><Ticket size={17} aria-hidden />요금</dt><dd>{event.price || "요금 확인 필요"}</dd></div><div><dt><MapPin size={17} aria-hidden />장소</dt><dd>{event.address}</dd></div></dl>
      <section className="detail-description"><h2>이런 나들이예요</h2><p>{event.description}</p></section>
      <div className="source-note"><a href={event.sourceUrl} target={event.demo ? undefined : "_blank"} rel="noopener noreferrer">{event.demo ? "미리보기 데이터 안내" : "원문에서 자세히 보기"}<ArrowUpRight size={14} aria-hidden /></a><p>{event.sourceName} · {checkedDateKST(event.checkedAt)} {event.demo ? "예시 기준" : "확인"}</p>{event.imageCredit ? <p>{event.imageCredit}</p> : null}</div>
    </article><TripPlanner event={event} places={places} date={date} initialIds={initialIds} /></div>
  </main>;
}
