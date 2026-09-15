import Link from "next/link";
import { Compass } from "lucide-react";
export default function NotFound() { return <main id="main" className="page-width empty-state"><Compass size={42} strokeWidth={1} aria-hidden /><h1>이 나들이를 찾을 수 없어요.</h1><p>링크가 잘못되었거나 제공이 끝난 정보일 수 있어요.</p><Link href="/" className="button button-primary">다른 나들이 찾아보기</Link></main>; }
