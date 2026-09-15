"use client";
import { useState } from "react";
import { ArrowDown, ArrowRight, Check, Copy, ExternalLink, Link2, MapPin, Plus, Share2 } from "lucide-react";
import { distanceKm, formatDate, isFresh, mapUrl, todayKST, type EventItem, type PlaceItem } from "@/lib/domain";

export function TripPlanner({ event, places, date, initialIds = [] }: { event: EventItem; places: PlaceItem[]; date: string; initialIds?: string[] }) {
  const [selected, setSelected] = useState<string[]>(initialIds.filter(id => places.some(p => p.id === id)).slice(0, 2));
  const [shareUrl, setShareUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "copied" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const active = isFresh(event) && event.status === "scheduled" && date >= todayKST() && event.startDate <= date && event.endDate >= date;
  const update = (ids: string[]) => { setSelected(ids); setShareUrl(""); setStatus("idle"); setError(""); };
  const toggle = (id: string) => update(selected.includes(id) ? selected.filter(p => p !== id) : selected.length < 2 ? [...selected, id] : selected);
  const copy = async (url: string) => { try { await navigator.clipboard.writeText(url); setStatus("copied"); } catch { setStatus("ready"); } };
  const share = async () => {
    if (shareUrl) { await copy(shareUrl); return; }
    setStatus("loading"); setError("");
    try {
      const response = await fetch("/api/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: event.id, placeIds: selected, date }) });
      const data = await response.json();
      if (!response.ok || typeof data.path !== "string" || !data.path.startsWith("/s/")) throw new Error(data.error ?? "공유 링크를 만들지 못했어요.");
      const url = new URL(data.path, window.location.origin).href;
      setShareUrl(url); await copy(url);
    } catch (e) { setStatus("error"); setError(e instanceof Error ? e.message : "잠시 후 다시 시도해 주세요."); }
  };
  return <aside className="trip-panel" aria-labelledby="trip-title">
    <div className="trip-panel-title"><div><p>가볍게 이어 가는 하루</p><h2 id="trip-title">나의 나들이</h2></div><Share2 size={22} strokeWidth={1.3} aria-hidden /></div>
    <p className="trip-date">{formatDate(date)}</p>
    <div className="itinerary"><div className="itinerary-step"><span className="step-number">1</span><div><small>오늘의 행사</small><strong>{event.title}</strong></div></div>{selected.map((id, i) => { const place = places.find(p => p.id === id)!; return <div className="itinerary-step" key={id}><span className="step-number">{i + 2}</span><div><small>{place.category}</small><strong>{place.title}</strong></div>{i === 0 && selected.length === 2 ? <button className="icon-button" aria-label="방문 순서 바꾸기" onClick={() => update([...selected].reverse())}><ArrowDown size={16} aria-hidden /></button> : null}</div>; })}</div>
    <div className="nearby-title"><h3>함께 들를 곳</h3><span>{selected.length} / 2</span></div>
    <p className="small-muted">마음에 드는 장소를 두 곳까지 골라 보세요.</p>
    <div className="nearby-list">{places.length ? places.map(place => { const chosen = selected.includes(place.id); const distance = event.lat !== null && event.lng !== null ? distanceKm({ lat: event.lat, lng: event.lng }, place) : null; return <div className={`nearby-option${chosen ? " chosen" : ""}`} key={place.id}><button className="nearby-select" type="button" aria-pressed={chosen} aria-label={`${place.title} ${chosen ? "빼기" : "추가"}`} disabled={!chosen && selected.length >= 2} onClick={() => toggle(place.id)}><span className="nearby-check">{chosen ? <Check size={14} aria-hidden /> : <Plus size={14} aria-hidden />}</span><span><strong>{place.title}</strong><small>{place.category}{distance !== null ? ` · 직선 ${distance.toFixed(1)}km` : ""}</small><small>{place.hours}</small></span></button><a href={mapUrl(place)} target="_blank" rel="noopener noreferrer" className="nearby-map" aria-label={`${place.title} 지도에서 보기 (새 창)`}><MapPin size={16} aria-hidden /></a></div>; }) : <p className="small-muted nearby-empty">주변 장소 정보가 아직 없어요.<br />행사 하나만으로도 나들이를 공유할 수 있어요.</p>}</div>
    {!active ? <p className="inline-message">선택한 날짜에 진행하는 행사인지 확인해 주세요. 종료된 날짜의 계획은 새로 공유할 수 없어요.</p> : null}
    <button className="button button-primary share-button" onClick={share} disabled={status === "loading" || !active}>{status === "copied" ? <Check size={17} aria-hidden /> : shareUrl ? <Copy size={17} aria-hidden /> : <Link2 size={17} aria-hidden />}{status === "loading" ? "링크 만드는 중" : status === "copied" ? "링크를 복사했어요" : shareUrl ? "링크 복사" : "이 나들이 공유하기"}</button>
    {error ? <p role="alert" className="inline-error">{error} 다시 공유하기를 눌러 주세요.</p> : null}
    {shareUrl ? <div className="share-result" role="status"><label htmlFor="share-url">{status === "copied" ? "동행에게 링크를 보내 보세요." : "아래 링크를 복사해서 보내 주세요."}</label><input id="share-url" readOnly value={shareUrl} onFocus={e => e.currentTarget.select()} /><a href={shareUrl} target="_blank" rel="noopener noreferrer">공유 페이지 보기 <ArrowRight size={13} aria-hidden /></a></div> : null}
    <a className="text-link map-action" href={mapUrl(event)} target="_blank" rel="noopener noreferrer">행사 위치를 지도에서 보기 <ExternalLink size={13} aria-hidden /></a>
    <p className="trip-footnote">운영시간과 휴무일은 방문 전 확인해 주세요.<br />방문 순서는 자유롭게 바꿀 수 있어요.</p>
  </aside>;
}
