# 주말픽

날짜와 지역으로 수도권 나들이를 찾고, 주변 방문지를 골라 동행에게 공유하는 모바일 웹입니다.

**Next.js + TypeScript + Neon PostgreSQL**로 구현했습니다. 키가 없어도 가상 행사로 전체 흐름을 확인할 수 있습니다. 미리보기는 화면 상단과 상세·공유 페이지에 표시됩니다.

## 바로 실행

Node.js 22 이상과 npm을 사용합니다.

```sh
npm install
npm run dev
```

<http://localhost:3100>에서 열립니다. 기본적으로 `DATABASE_URL`이 없으면 미리보기 모드입니다. 미리보기 공유 링크는 날짜와 검증된 예시 장소 ID를 담으므로 서버 재시작 후에도 열립니다. 외부 기기에서 열려면 해당 기기가 접근 가능한 배포 주소가 필요합니다.

## 구현된 기능

- 한국 시간 기준 날짜 선택, 이번 토요일·일요일·다음 주말 바로 선택.
- 서울·경기·인천, 관심사 필터, 추천순·시작일순 정렬.
- 조건에 맞는 후보를 우선 3개 표시하고 추가 결과 펼치기.
- 행사 상세, 요금·운영시간·출처·확인 시각.
- 같은 브라우저에서 유지되는 저장 목록과 저장 취소.
- 주변 장소 최대 2개 선택, 방문 순서 변경, 카카오맵 링크.
- 공유 링크 생성·복사, 다른 브라우저에서 읽기 전용 계획 열기.
- 결과 없음, 잘못된 링크, 데이터 연결 실패, 저장 공간 제한, 클립보드 권한 거부 처리.
- Neon 스키마와 API, TourAPI 수집 스크립트·인증된 예약 수집 경로.

## Neon과 실제 데이터 연결

1. Neon에서 이 서비스용 프로젝트/데이터베이스를 만들고 연결 문자열을 준비합니다.
2. 공공데이터포털의 [한국관광공사 국문 관광정보 서비스](https://www.data.go.kr/data/15101578/openapi.do)를 신청해 서비스 키를 발급합니다.
3. `.env.example`을 `.env.local`로 복사하고 값을 입력합니다. 이미 `.env`에 넣었다면 그대로 사용할 수 있습니다. 두 파일이 모두 있으면 `.env.local`이 우선합니다. 두 파일 모두 Git에서 제외됩니다.

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@YOUR-NEON-HOST/DBNAME?sslmode=require
DATA_MODE=auto
TOUR_API_KEY=YOUR_TOUR_API_KEY
CRON_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
TOUR_DAILY_BUDGET=500
NEXT_PUBLIC_SITE_URL=https://YOUR-DOMAIN
```

4. 스키마를 만들고 첫 데이터를 수집합니다.

```sh
npm run data:setup
npm run dev
```

`data:setup`은 `db:migrate`와 `data:sync`를 순서대로 실행합니다. **키를 저장하는 것만으로 DB 초기화·행사 수집이 실행되지는 않습니다.** 이미 켜 둔 서버는 종료하고 다시 시작하세요. `npm run start`로 실행한다면 `npm run build` 후 다시 시작해야 정적 페이지까지 새 설정이 반영됩니다.

```sh
npm run data:status  # 설정 모드, DB 행사 수, 최근 수집, 로컬 서버 모드 확인
npm run data:sync    # 이후 실제 데이터 갱신
```

`data:status`는 키 값을 출력하지 않습니다. 설정은 실제 데이터인데 로컬 서버가 미리보기인 경우 재시작을 안내합니다. 로컬에서 `dev` 또는 `start`만 켜 두는 것은 예약 수집을 실행하지 않습니다. 자동 갱신은 아래 예약 실행 설정을 완료해야 합니다.

Neon 연결에는 [`@neondatabase/serverless`](https://neon.com/docs/serverless/serverless-driver)의 HTTP 드라이버와 매개변수화된 SQL을 사용합니다. Supabase 의존성은 없습니다. `db:migrate`는 현재 스키마를 반복 적용할 수 있으며 기존 행을 삭제하지 않습니다.

`DATABASE_URL`을 설정한 뒤 DB 연결이 실패하면 오류 상태를 표시합니다. 실제 데이터 오류를 예시 데이터로 자동 대체하지 않습니다. 연결된 DB를 유지하면서 미리보기를 확인하려면 `DATA_MODE=demo`를 명시하세요.

## 수집 설계

공식 활용명세를 확인한 날짜: **2026-09-11**. 기준 API는 `https://apis.data.go.kr/B551011/KorService2`입니다.

- `searchFestival2`: `lDongRegnCd` 11(서울), 41(경기), 28(인천)으로 조회합니다. 폐기 예정인 `areaCode`를 사용하지 않습니다.
- 시작일이 지난 진행 중 행사도 찾도록 시작일을 365일 이전까지 조회하고, 오늘부터 향후 28일과 겹치는 행사만 보관합니다.
- `detailCommon2`, `detailIntro2`: 소개·운영시간·요금·대표이미지 이용 조건을 읽습니다.
- `locationBasedList2`: 행사 주변 5km의 관광지·문화시설을 수집합니다. 화면 거리는 직선거리입니다.
- `areaBasedSyncList2`: 최근 7일간 비표출된 행사 식별자는 추천 중단 상태로 바꿉니다. 주최 측 취소 여부와 비표출을 동일하게 단정하지 않습니다.
- 데이터 누락으로 요금·시간이 없으면 확인 필요로 표시합니다. 확인 시점이 7일 이상 오래된 실제 행사는 새 추천에서 제외합니다.
- 미수집 항목을 먼저 처리하고 이후 확인 시각이 오래된 항목부터 갱신합니다. 하루 중 이미 갱신한 행사는 건너뜁니다.
- 모든 호출과 재시도는 Neon의 일별 호출 예산에서 먼저 차감합니다. 기본 500회, 코드상 상한은 800회이며 실제 발급 계정 한도에 맞게 낮출 수 있습니다.
- HTTP 429/5xx와 네트워크 실패만 제한적으로 재시도합니다. 인증 실패를 반복 요청하지 않습니다. URL·키를 오류 로그에 남기지 않습니다.
- 동시에 두 수집 작업이 돌지 않게 DB 잠금을 사용합니다. 실패하거나 중단된 작업의 잠금에는 만료 시간이 있습니다.
- 이미지 출처·이용 유형을 함께 저장합니다. 확인된 TourAPI 도메인의 공공누리 1·3유형 이미지에 한해 표시하며 실제 이미지는 잘라내지 않고 전체가 보이게 배치합니다.

### 수집 범위의 현재 제한

한 실행은 행사 60건, 지역별 검색 10페이지와 비표출 목록 5페이지를 상한으로 둡니다. 처리하지 못한 후보 수(`deferred`)와 페이지 상한 도달(`truncatedPages`)을 기록합니다. 230초 이후 새 행사 처리를 중단합니다. 완전한 전국 수집이나 1년 이전에 시작한 장기 행사를 보장하는 구조는 아닙니다.

관심사는 행사 제목의 일부 키워드로 분류하는 초기 규칙입니다. `src/lib/tour-api.ts`의 분류 규칙을 실제 데이터 검증 결과에 맞게 확장할 수 있습니다. 운영일·휴무일의 자유서술 내용을 자동 판정하지 않으므로 방문 전 원문 확인을 안내합니다.

### 예약 실행

서버 또는 예약 작업 도구에서 하루 한 번 `npm run data:sync`를 실행하거나, HTTPS로 배포된 `/api/cron/sync`에 GET 요청을 보내세요. HTTP 요청에는 `Authorization: Bearer <CRON_SECRET>` 헤더가 필요합니다. 인증이 없거나 secret이 준비되지 않았으면 실행되지 않습니다.

예약 실행 예시 설정은 `vercel.json`에 있습니다. Vercel을 사용할 경우 배포 환경변수에도 `CRON_SECRET`을 넣어야 합니다. 다른 호스팅에서는 해당 호스트의 예약 작업을 같은 경로에 연결합니다. 실행 시간·예약 기능·비용은 배포 환경의 조건을 확인하세요.

운영계정의 승인과 호출량은 공공데이터포털의 실제 발급 조건에 따릅니다.

수집 결과 확인:

```sql
SELECT id, status, started_at, finished_at, stats, error
FROM wp_sync_runs
ORDER BY started_at DESC
LIMIT 10;
```

## 검증

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

단위·통합 테스트는 한국 시간과 날짜 경계, 행사 필터, 공유 입력, 외부 응답·재시도·쿼터를 확인합니다. PGlite의 실제 PostgreSQL 엔진에서 스키마·쿼리·외래 키·영속 공유·호출 예산·수집 잠금을 검증합니다.

브라우저 테스트는 Google Chrome을 사용합니다. Chrome이 없다면 설치하거나 `playwright.config.ts`의 `channel`을 제거하고 `npx playwright install chromium`을 실행하세요. `test:e2e` 전에 `npm run build`가 필요합니다. 테스트가 서버를 시작하며, 같은 포트에 기존 서버가 있으면 재사용합니다.

실제 Neon·TourAPI 연결과 로컬 화면의 검증 결과는 `VALIDATION.md`를 참고하세요. 공개 배포와 예약 수집의 실행 여부는 배포 환경에서 별도로 확인해야 합니다.

## 구조

```text
src/app/                   화면, 서버 API
src/components/            필터, 행사 카드, 저장, 나들이 계획
src/lib/domain.ts          날짜, 검증, 추천 규칙
src/lib/database.ts        Neon 드라이버와 PostgreSQL 저장소
src/lib/catalog.server.ts  실제 데이터 / 미리보기 연결
src/lib/tour-api.ts        응답 정규화와 수집
db/001_initial.sql         데이터베이스 스키마
scripts/                   초기화와 수집 실행
tests/                     단위·DB·브라우저 테스트
tokens.css                 디자인 토큰
```

## 공개 범위와 저장

행사 조회는 공개입니다. 공유 생성은 실제 저장된 행사와 주변 장소만 허용합니다. 실제 DB 공유 링크는 UUID이며 링크를 아는 사람에게 공개됩니다. 저장 목록은 localStorage에 남고 계정 간 동기화는 없습니다. 공유 데이터에는 방문 날짜와 장소 ID만 저장합니다.

실제 공유 생성에는 시간대별 요청 제한이 있습니다. Vercel에서는 플랫폼 제공 IP 헤더의 시간별 해시를 사용합니다. 다른 호스트에서는 위조된 IP 헤더를 신뢰하지 않고 공통 버킷(시간당 30개)을 사용합니다. 다른 플랫폼에 공개 배포할 때는 그 플랫폼의 신뢰할 수 있는 클라이언트 식별 수단에 맞춰 조정하세요.

## 이미지와 서체

미리보기 사진은 분위기 참고용이며 실제 예시 행사의 사진으로 표시하지 않습니다. 내려받은 원본은 `public/images`에 있습니다.

- 궁궐: [Albert Sidorov / Unsplash](https://unsplash.com/photos/traditional-korean-palace-with-people-in-hanbok-YE2t2jNN-T0), 사진 ID `photo-1765809113903-0a886f805fd0`.
- 숲: Unsplash 이미지 ID `photo-1441974231531-c6227db76b6e`.
- 풍경: Unsplash 이미지 ID `photo-1470071459604-3b5ec3a7fe05`.
- 전시 참고: Unsplash 이미지 ID `photo-1579783902614-a3fb3927b6a5`.
- 식당 참고: Unsplash 이미지 ID `photo-1555396273-367ea4eb4db5`.
- [Unsplash License](https://unsplash.com/license).
- Gowun Batang, Noto Sans KR는 Fontsource 패키지로 로컬 제공하며 패키지의 OFL 라이선스를 따릅니다.

기획 출발점: [요즘IT API 소개 기사](https://yozm.wishket.com/magazine/detail/3920/).
