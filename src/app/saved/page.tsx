import { SavedList } from "@/components/saved-list";
export const metadata = { title: "저장한 나들이" };
export default function SavedPage() { return <main id="main" className="page-width saved-page"><div className="page-heading"><p>언젠가 가고 싶은 곳들을 모아서</p><h1>저장한 나들이</h1><p>지금 사용하는 브라우저에 저장되어 있어요.</p></div><SavedList /></main>; }
