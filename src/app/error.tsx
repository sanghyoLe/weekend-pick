"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="main" className="page-width empty-state"><h1>잠시 연결이 끊겼어요.</h1><p>정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p><button className="button button-primary" onClick={reset}>다시 불러오기</button></main>; }
