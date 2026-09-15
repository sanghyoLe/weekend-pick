import { config } from "dotenv";
import { neonQuery } from "../src/lib/database";
import { addDays, nextSaturday, todayKST } from "../src/lib/domain";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const demo = process.env.DATA_MODE === "demo" || !process.env.DATABASE_URL;
  console.log(`현재 설정: ${demo ? "미리보기" : "Neon 실제 데이터"}`);
  console.log(`TourAPI 키: ${process.env.TOUR_API_KEY ? "설정됨" : "미설정"}`);
  console.log(`예약 수집 인증: ${(process.env.CRON_SECRET?.length ?? 0) >= 32 ? "설정됨 (예약 실행 여부는 배포 환경에서 확인)" : "미설정 — 현재 자동 갱신을 보장하지 않습니다"}`);

  if (process.env.DATABASE_URL) {
    const query = neonQuery();
    const tables = await query("SELECT to_regclass('public.wp_events') AS events, to_regclass('public.wp_sync_runs') AS runs");
    if (!tables[0]?.events || !tables[0]?.runs) {
      console.log("DB 연결 성공. 테이블이 없습니다. npm run data:setup으로 초기화·첫 수집을 실행하세요.");
    } else {
      const today = todayKST();
      const counts = await query(`SELECT count(*)::int AS total,
        count(*) FILTER (WHERE status='scheduled' AND end_date >= $1::date)::int AS upcoming,
        count(*) FILTER (WHERE status='scheduled' AND start_date <= $2::date AND end_date >= $2::date
          AND ((data->>'checkedAt')::timestamptz AT TIME ZONE 'Asia/Seoul')::date >= $3::date)::int AS weekend,
        max(data->>'checkedAt') AS latest_check
        FROM wp_events`, [today, nextSaturday(today), addDays(today, -7)]);
      console.log("행사 현황:", JSON.stringify(counts[0], null, 2));
      const runs = await query("SELECT status, started_at, finished_at, stats FROM wp_sync_runs ORDER BY started_at DESC LIMIT 1");
      console.log("최근 수집:", runs.length ? JSON.stringify(runs[0], null, 2) : "실행 이력 없음 — npm run data:sync를 실행하세요.");
      if (counts[0]?.total === 0) console.log("저장된 행사가 없습니다. npm run data:sync로 실제 데이터를 수집하세요.");
    }
  }

  try {
    const response = await fetch("http://127.0.0.1:3100/api/events", { signal: AbortSignal.timeout(5000) });
    const body = await response.json() as { demo?: boolean; events?: unknown[] };
    if (response.ok && typeof body.demo === "boolean" && Array.isArray(body.events)) {
      console.log(`로컬 서버(3100): ${body.demo ? "미리보기" : "실제 데이터"}, 기본 날짜의 행사 ${body.events.length}건`);
      if (body.demo !== demo) console.log("서버와 설정 파일의 모드가 다릅니다. 실행 중인 서버를 종료하고 다시 시작하세요. npm run start를 사용한다면 npm run build도 다시 실행하세요.");
    } else console.log("로컬 서버가 행사 데이터를 반환하지 못했습니다. DB 초기화·연결 상태를 확인하세요.");
  } catch { console.log("로컬 서버(3100)에 연결할 수 없습니다. npm run dev로 시작할 수 있습니다."); }
}

main().catch(() => {
  // Database errors can contain credentials or hostnames. Keep diagnostics safe to share.
  console.error("상태 확인 실패. DATABASE_URL과 Neon 연결 상태를 확인해 주세요. 키 값은 출력하지 않습니다.");
  process.exitCode = 1;
});
