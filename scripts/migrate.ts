import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import { neonQuery } from "../src/lib/database";

config({ path: [".env.local", ".env"], quiet: true });
async function main() {
  if (!process.env.DATABASE_URL) throw new Error(".env.local에 Neon DATABASE_URL을 설정해 주세요.");
  const sql = neonQuery();
  const schema = await readFile(new URL("../db/001_initial.sql", import.meta.url), "utf8");
  for (const statement of schema.split(";").map(s => s.trim()).filter(Boolean)) await sql(statement);
  console.log("Neon 스키마 준비 완료. 기존 데이터는 유지됩니다.");
}
main().catch(() => { console.error("DB 초기화 실패. DATABASE_URL과 Neon 연결 상태를 확인해 주세요."); process.exitCode = 1; });
