"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Bookmark, Flower2, Link2 } from "lucide-react";
import { useSaved } from "./saved-store";

export function Header({ demo }: { demo: boolean }) {
  const path = usePathname();
  const { ids } = useSaved();
  return <>
    <a className="skip-link" href="#main">본문으로 건너뛰기</a>
    {demo ? <div className="preview-banner"><span>미리보기 · 가상의 행사로 나들이를 계획해 보세요.</span><Link href="/about">안내 <ArrowUpRight size={13} aria-hidden /></Link></div> : null}
    <header className="masthead page-width">
      <div className="masthead-line"><span>가까운 곳에서, 새로운 주말</span><span>서울 · 경기 · 인천</span></div>
      <Link className="wordmark" href="/" aria-label="주말픽 홈"><Flower2 strokeWidth={1.4} aria-hidden /><span>주말픽<span className="wordmark-dot">.</span></span></Link>
      <nav aria-label="주 메뉴" className="main-nav">
        <Link href="/" className={path === "/" ? "active" : ""} aria-current={path === "/" ? "page" : undefined}>주말 발견</Link>
        <Link href="/saved" className={path === "/saved" ? "active" : ""} aria-current={path === "/saved" ? "page" : undefined}><Bookmark size={15} aria-hidden /> 저장한 나들이 {ids.length > 0 ? <span className="saved-count">{ids.length}</span> : null}</Link>
        <Link href="/links" className={path === "/links" ? "active" : ""} aria-current={path === "/links" ? "page" : undefined}><Link2 size={15} aria-hidden /> 공식 링크</Link>
      </nav>
    </header>
  </>;
}
