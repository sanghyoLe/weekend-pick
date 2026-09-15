import { config } from "dotenv";
import { createRepository, neonQuery } from "../src/lib/database";
import { syncTourData, TourError } from "../src/lib/tour-api";
config({ path: [".env.local", ".env"], quiet: true });
async function main() {
  if (!process.env.DATABASE_URL || !process.env.TOUR_API_KEY) throw new TourError("DATABASE_URL_AND_TOUR_API_KEY_REQUIRED");
  const result = await syncTourData(createRepository(neonQuery()), process.env.TOUR_API_KEY, Number(process.env.TOUR_DAILY_BUDGET ?? 500));
  console.log(JSON.stringify(result, null, 2));
}
main().catch(error => { console.error(error instanceof TourError ? error.code : "수집 실패. 환경설정과 DB 마이그레이션을 확인해 주세요."); process.exitCode = 1; });
