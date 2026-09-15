import type { Metadata } from "next";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "이번 주 행사 링크",
  description: "주말픽이 고른 서울·경기 이번 주 행사 공식 안내 링크입니다.",
};

const events = [
  {
    title: "서울거리예술축제",
    meta: "9/19(토)–20(일) · 서울 광진·성동",
    note: "뚝섬한강공원·서울숲 / 무료",
    href: "https://www.sfac.or.kr/site/SFAC_KOR/12/11204040000002025040909.jsp",
  },
  {
    title: "수원재즈페스티벌",
    meta: "9/18(금)–19(토) · 경기 수원",
    note: "광교호수공원 재미난밭 / 무료",
    href: "https://www.suwon.go.kr/sw-www/deptHome/dep_tour/culture05/culture05_03/culture05_03_03.jsp",
  },
  {
    title: "시흥갯골축제",
    meta: "9/18(금)–20(일) · 경기 시흥",
    note: "시흥갯골생태공원 / 입장 무료",
    href: "https://shggfestival.com/",
  },
  {
    title: "부천국제만화축제",
    meta: "9/18(금)–20(일) · 경기 부천",
    note: "한국만화박물관 일원 / 일반 5,000원",
    href: "https://bicof.com/",
  },
  {
    title: "광주시 남한산성문화제",
    meta: "9/18(금)–20(일) · 경기 광주",
    note: "남한산성도립공원 일원 / 무료",
    href: "https://www.nsart.or.kr/culture/business.do?act=detail&clbsId=163",
  },
] as const;

export default function LinksPage() {
  return (
    <main id="main" className="page-width links-page">
      <header className="links-hero">
        <p className="links-kicker">주말픽 · 이번 주</p>
        <div className="links-mark" aria-label="주말픽">주말픽<span>.</span></div>
        <h1>이번 주말,<br />어디로 갈까요?</h1>
        <p className="links-lede">서울·경기에서 열리는 행사 다섯 곳의 공식 안내만 모았습니다.</p>
        <div className="links-period"><CalendarDays size={15} aria-hidden />9월 18일(금) — 20일(일)</div>
      </header>

      <section className="links-list" aria-labelledby="links-title">
        <h2 id="links-title">공식 안내 바로가기</h2>
        {events.map((event, index) => (
          <a className="links-card" href={event.href} target="_blank" rel="noopener noreferrer" key={event.title}>
            <span className="links-card-number">0{index + 1}</span>
            <span className="links-card-body">
              <strong>{event.title}</strong>
              <span>{event.meta}</span>
              <span className="links-card-note"><MapPin size={13} aria-hidden />{event.note}</span>
            </span>
            <ArrowUpRight className="links-card-arrow" size={18} aria-hidden />
          </a>
        ))}
      </section>

      <p className="links-footnote">시간·요금·접수 조건은 바뀔 수 있어요. 출발 전 공식 안내를 한 번 더 확인해주세요.</p>
    </main>
  );
}
