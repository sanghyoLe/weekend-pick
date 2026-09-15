# 주말픽 001 — 제작·출처 기록

대상 주간: 2026-09-14~2026-09-20. 제작·재확인일: 2026-09-15 KST.

업로드 파일은 `card-01.jpg`부터 `card-07.jpg`까지 순서대로 선택하고 `caption.txt`를 사용한다. `preview.jpg`는 전체 검토용이며 업로드할 개별 카드가 아니다. 각 카드는 1080×1350 JPEG다. 인스타그램에 실제 발행하지 않았다.

## 정보 확인

기존 Neon의 TourAPI 행사 데이터를 후보로 사용했다. 다섯 행사 모두 2026-09-15에 `KorService2/detailIntro2`를 다시 호출하여 기간·시간·요금·장소·프로그램을 확인했다. 인증키는 이 산출물에 포함하지 않았다. 원문과 대조해 자체 문장으로 요약했으며, 예약 필드가 비었다는 이유로 예약이 필요 없다고 표시하지 않았다.

| 행사 | TourAPI contentId | 공식 안내 및 대조 |
|---|---|---|
| 서울거리예술축제 | 706180 | [한국관광공사 상세](https://english.visitkorea.or.kr/svc/contents/contentsView.do?vcontsId=96183), [서울문화재단](https://www.sfac.or.kr/site/SFAC_KOR/12/11204040000002025040909.jsp), [행사 홈페이지](https://ssaf.or.kr/index) |
| 수원재즈페스티벌 | 2616316 | [수원시 행사 안내](https://www.suwon.go.kr/sw-www/deptHome/dep_tour/culture05/culture05_03/culture05_03_03.jsp)에서 9/18~19, 17:30 시작, 재미난밭 확인. 종료시간·무료 요금은 당일 TourAPI 응답 기준 |
| 시흥갯골축제 | 142197 | [공식 홈페이지](https://shggfestival.com/), [염전 체험](https://shggfestival.com/programs/salt-farm/), [소금창고 인형극장](https://shggfestival.com/programs/salt-puppet/). 전체 행사 시간은 TourAPI 기준이며 개별 프로그램은 다름 |
| 부천국제만화축제 | 589386 | [한국관광공사 축제 소개](https://korean.visitkorea.or.kr/kfes/detail/fstvlDetail.do?fstvlCntntsId=883fb3cd-8ce1-482b-9e57-02947b44f038), [공식 홈페이지](https://bicof.com/). 웹 도구에서 공식 홈페이지를 열지 못해 시간·요금은 당일 TourAPI 응답 사용 |
| 광주시 남한산성문화제 | 624181 | [광주시문화재단 공식 게시물](https://www.nsart.or.kr/culture/business.do?act=detail&clbsId=163)에서 산성 트래킹 사전 접수 안내 확인. 기간·무료 요금·프로그램은 당일 TourAPI 응답 사용 |

남한산성문화제의 통합 운영시간은 API에 ‘변동’으로 반환되어 ‘프로그램별 상이’로 표시했다. 부천 사전신청 할인은 신청 마감 여부를 확인하지 못했으므로 3,000원을 기본 요금으로 홍보하지 않았다. 수원재즈는 금·토 개최이며 일요일에는 개최 표시를 하지 않았다. 시흥 열기구 체험은 09:00부터지만, 전체 행사 시간과 구분하기 위해 이번 카드에 해당 프로그램의 시간을 추가하지 않았다.

## 그래픽과 파일

사진·행사 포스터를 사용하지 않았다. 기존 수집 이미지가 변경금지 이용 유형이라, 이번 주간 모음은 직접 작성한 SVG 도형과 타이포그래피로 구성했다. 그래픽은 각 주제를 상징하며 실제 행사 현장이나 지도를 재현하지 않는다.

기존 프로젝트의 Gowun Batang·Noto Sans KR 서체와 초록·종이색 계열을 활용했다. 편집 가능한 원본은 `index.html`이다. 저장소 루트에서 다음 명령으로 이미지를 다시 생성한다.

```sh
node outputs/instagram/2026-09-14-weekly/render.mjs
```

별도 신규 패키지 설치 없이 기존 Playwright와 Chrome을 사용한다. 문구의 줄 넘침·카드 경계·서체 로딩을 검사하고 7장의 JPEG 및 검토용 미리보기를 출력한다. 날짜가 지난 뒤 재사용하려면 행사 정보를 새로 확인해야 한다.
