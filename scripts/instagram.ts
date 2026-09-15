// 인스타 초안 생성: 후보 선정 → 카드 4장 JPEG + 캡션 → .data/instagram/<발행일>/
// ponytail: 발행(Instagram API)·R2 업로드·DB 상태 테이블은 계정 연결 확인 후 추가. 지금은 로컬 초안만.
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { createRepository, neonQuery } from "@/lib/database";
import { addDays, todayKST } from "@/lib/domain";
import { buildPost, pick, render } from "@/lib/editorial";

async function main() {
  const today = process.argv[2] ?? todayKST();
  const outRoot = resolve(".data/instagram");
  await mkdir(outRoot, { recursive: true });
  const recent: string[] = [];
  for (const d of await readdir(outRoot)) {
    if (d < addDays(today, -28) || d >= today) continue; // 같은 날 재실행은 같은 행사를 다시 만든다
    try { recent.push(JSON.parse(await readFile(resolve(outRoot, d, "meta.json"), "utf8")).eventId); } catch { /* 미완성 폴더 */ }
  }
  const repo = createRepository(neonQuery());
  const event = pick(await repo.events(), today, recent);
  if (!event) { console.log(JSON.stringify({ status: "skipped", reason: "no eligible event", today })); return; }

  const post = buildPost(event, today);
  const out = resolve(outRoot, today);
  await mkdir(out, { recursive: true });
  const template = await readFile("templates/instagram.html", "utf8");
  const html = render(template, { ...post.vars, fonts: pathToFileURL(resolve("node_modules")).href });
  await writeFile(resolve(out, "cards.html"), html);
  // ponytail: 3유형 사진은 자르지 않고 원본 그대로 카드에 배치. 실패하면 사진 없는 카드로 진행
  if (event.image) try { await writeFile(resolve(out, "photo.jpg"), Buffer.from(await (await fetch(event.image)).arrayBuffer())); } catch { /* 사진 없는 카드로 진행 */ }
  await writeFile(resolve(out, "caption.txt"), post.caption);
  await writeFile(resolve(out, "meta.json"), JSON.stringify({ ...post, status: "draft", imageLicense: event.imageCredit, imageUsed: Boolean(event.image), snapshot: event }, null, 2));

  const browser = await chromium.launch({ channel: "chrome" }); // ponytail: e2e와 같이 설치된 Chrome 사용, 번들 브라우저 다운로드 생략
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(resolve(out, "cards.html")).href);
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => [...document.querySelectorAll(".card")].map(c => c.scrollHeight > c.clientHeight));
  for (let i = 1; i <= 4; i++) await page.locator(`#c${i}`).screenshot({ path: resolve(out, `card-${i}.jpg`), type: "jpeg", quality: 90 });
  await browser.close();
  console.log(JSON.stringify({ status: overflow.some(Boolean) ? "needs-review" : "draft", overflow, eventId: event.id, title: event.title, visitDays: post.visitDays, out }));
}
main();
