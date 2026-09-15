import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Header } from "@/components/header";
import { isDemo } from "@/lib/catalog.server";
import "@fontsource/gowun-batang/400.css";
import "@fontsource/gowun-batang/700.css";
import "@fontsource-variable/noto-sans-kr";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100"),
  title: { default: "주말픽 — 가까운 곳에서, 새로운 주말", template: "%s · 주말픽" },
  description: "날짜와 지역을 고르면 만나는 주말 나들이. 서울·경기·인천의 행사와 주변 방문지를 골라 동행에게 공유하세요.",
  robots: { index: process.env.DATA_MODE !== "demo" && Boolean(process.env.DATABASE_URL), follow: true },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f8f7f2" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body><Header demo={isDemo()} />{children}<footer className="footer page-width"><Link href="/" className="footer-brand">주말픽.</Link><p>가까운 곳에서, 새로운 주말.</p><Link href="/about">데이터와 이미지 안내 <ArrowUpRight size={13} aria-hidden /></Link></footer></body></html>;
}
