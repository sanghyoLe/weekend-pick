import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink, MapPin } from "lucide-react";
import { decodeDemoPlan } from "@/lib/sharing";
import { demoEvents, demoPlaces } from "@/lib/demo";
import { isDemo, repository } from "@/lib/catalog.server";
import { distanceKm, formatDate, isFresh, mapUrl, todayKST, type PlanInput } from "@/lib/domain";
import { EventPhoto } from "@/components/event-card";
export const dynamic = "force-dynamic";
export const metadata = { title: "함께 떠나는 나들이", robots: { index: false, follow: false } };
export default async function SharedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let plan: PlanInput | null;
  let event;
  let places;
  if (id.startsWith("d.")) {
    plan = decodeDemoPlan(id);
    if (!plan) notFound();
    event = demoEvents().find(e => e.id === plan!.eventId);
    places = plan.placeIds.flatMap(pid => demoPlaces.find(p => p.id === pid) ?? []);
    if (places.length !== plan.placeIds.length || !event || (places.length > 0 && (event.lat === null || event.lng === null || places.some(p => distanceKm({ lat: event!.lat!, lng: event!.lng! }, p) > 5)))) notFound();
  } else {
    if (isDemo() || !/^[a-f0-9-]{36}$/.test(id)) notFound();
    const repo = repository();
    plan = await repo.plan(id);
    if (!plan) notFound();
    [event, places] = await Promise.all([repo.event(plan.eventId), repo.places(plan.placeIds)]);
  }
  if (!event) notFound();
  const expired = !isFresh(event) || plan.date < todayKST() || event.status !== "scheduled" || plan.date < event.startDate || plan.date > event.endDate;
  const canEdit = event.demo === isDemo();
  return <main id="main" className="shared-page page-width"><div className="shared-intro"><p>함께 보내고 싶은 하루</p><h1>이번 주말,<br />여기 어때요?</h1><span>{formatDate(plan.date, true)}</span></div><article className="shared-plan"><div className="shared-photo"><EventPhoto event={event} priority /></div><div className="shared-body"><span className="detail-kicker">{event.region} · {event.category}</span><h2>{event.title}</h2>{event.demo ? <p className="demo-notice">가상의 행사·장소로 만든 미리보기 계획입니다.</p> : null}{expired ? <p className="inline-message">날짜가 지났거나 행사 정보가 바뀌었어요. 방문 전 최신 일정을 확인해 주세요.</p> : null}<ol className="shared-stops">{[event, ...places].map((stop, i) => <li key={stop.id}><span className="step-number">{i + 1}</span><div><strong>{stop.title}</strong><p><MapPin size={12} aria-hidden />{stop.address}</p><small>{stop.hours || "운영시간 확인 필요"}</small></div><a className="icon-button" href={mapUrl(stop)} target="_blank" rel="noopener noreferrer" aria-label={`${stop.title} 지도 보기 (새 창)`}><ExternalLink size={17} aria-hidden /></a></li>)}</ol><p className="trip-footnote">방문 순서는 자유롭게 바꿔도 좋아요.<br />운영시간과 휴무일은 방문 전에 확인해 주세요.</p>{canEdit ? <Link href={`/events/${event.id}?date=${plan.date}&places=${plan.placeIds.join(",")}`} className="button button-primary">이 나들이 살펴보기 <ArrowRight size={16} aria-hidden /></Link> : <Link href="/" className="button button-primary">나들이 더 찾아보기 <ArrowRight size={16} aria-hidden /></Link>}</div></article></main>;
}
