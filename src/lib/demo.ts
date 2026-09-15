import { addDays, nextSaturday, todayKST, type EventItem, type PlaceItem } from "./domain";

// Fictional product fixtures. No fixture is represented as a real event.
export function demoEvents(): EventItem[] {
  const start = addDays(nextSaturday(), -7);
  const base = { startDate: start, endDate: addDays(start, 42), checkedAt: todayKST(), status: "scheduled" as const, demo: true, sourceName: "주말픽 미리보기", sourceUrl: "/about", imageCredit: "Unsplash · 분위기 참고용 사진, 실제 행사 사진이 아닙니다." };
  return [
    { ...base, id: "demo-forest", title: "숲 사이, 느린 산책", subtitle: "초록이 짙은 길에서 잠깐 쉬어 가기", region: "서울", district: "성동구", category: "자연·산책", address: "서울 성동구 뚝섬로 273", lat: 37.5445, lng: 127.0374, description: "숲길을 천천히 걷고, 가까운 문화 공간까지 이어 보는 나들이 예시입니다. 산책과 주변 장소 선택 흐름을 체험할 수 있도록 만든 가상의 프로그램입니다. 실제 운영 행사와 일정이 아닙니다.", price: "무료 · 예시", hours: "10:00–18:00 · 예시", image: "/images/forest.jpg" },
    { ...base, id: "demo-palace", title: "성곽 아래, 가을 한 장", subtitle: "오래된 풍경과 오늘의 취향이 만나는 곳", region: "경기", district: "수원시", category: "전시·문화", address: "경기 수원시 팔달구 정조로 825", lat: 37.2819, lng: 127.0142, description: "성곽 주변에서 전시와 산책을 함께 즐기는 가상의 문화 나들이입니다. 행사 정보, 주변 방문지, 공유 기능을 확인하기 위한 예시이며 실제 개최 정보가 아닙니다.", price: "요금 확인 필요", hours: "11:00–19:00 · 예시", image: "/images/palace.jpg" },
    { ...base, id: "demo-music", title: "노을 옆 작은 음악회", subtitle: "해가 기울면 시작되는 주말의 한 곡", region: "인천", district: "연수구", category: "공연·축제", address: "인천 연수구 컨벤시아대로 160", lat: 37.3927, lng: 126.6395, description: "공원 산책과 저녁 공연을 연결하는 가상의 음악회입니다. 일정 선택과 코스 공유를 위한 미리보기 데이터로, 실제 공연·예매 정보를 제공하지 않습니다.", price: "무료 · 예시", hours: "17:00–19:00 · 예시", image: "/images/sunset.jpg" },
    { ...base, id: "demo-gallery", title: "골목 끝 작은 전시", subtitle: "걷다가 발견하는 새로운 시선", region: "서울", district: "종로구", category: "전시·문화", address: "서울 종로구 삼청로 30", lat: 37.5788, lng: 126.9804, description: "전시를 보고 주변 골목을 걷는 나들이 예시입니다. 실제 전시 제목, 운영 일정, 관람료를 뜻하지 않습니다.", price: "요금 확인 필요", hours: "10:00–18:00 · 예시", image: "/images/gallery.jpg" },
    { ...base, id: "demo-market", title: "주말의 작은 식탁", subtitle: "새로운 맛을 찾아 천천히 한 바퀴", region: "경기", district: "수원시", category: "먹거리", address: "경기 수원시 팔달구 팔달문로 9", lat: 37.2775, lng: 127.0176, description: "시장과 주변 산책을 묶어 보는 가상의 먹거리 행사입니다. 미리보기용으로 만든 이름과 일정이며 실제 개최 정보는 아닙니다.", price: "개별 구매 · 예시", hours: "11:00–17:00 · 예시", image: "/images/market.jpg" },
    { ...base, id: "demo-garden", title: "정원에서 보내는 오후", subtitle: "서두르지 않아도 좋은 초록빛 시간", region: "인천", district: "남동구", category: "자연·산책", address: "인천 남동구 무네미로 236", lat: 37.4577, lng: 126.7502, description: "정원을 거닐며 하루를 쉬어 가는 나들이 예시입니다. 실제 행사나 운영 프로그램이 아닌 제품 체험용 데이터입니다.", price: "무료 · 예시", hours: "운영시간 확인 필요", image: "/images/forest.jpg" },
  ];
}

export const demoPlaces: PlaceItem[] = [
  { id: "demo-seoul-walk", title: "숲길 산책 지점", category: "산책 · 예시", address: "서울 성동구 서울숲 일대", lat: 37.5460, lng: 127.042, hours: "방문 전 확인", description: "숲길을 이어 걷는 방문 후보입니다.", sourceUrl: "/about", demo: true },
  { id: "demo-seoul-culture", title: "근처 문화 공간", category: "문화시설 · 예시", address: "서울 성동구 성수동 일대", lat: 37.5476, lng: 127.048, hours: "방문 전 확인", description: "전시와 휴식을 함께 생각해 보는 예시 장소입니다.", sourceUrl: "/about", demo: true },
  { id: "demo-suwon-walk", title: "성곽길 산책 지점", category: "산책 · 예시", address: "경기 수원시 팔달구 일대", lat: 37.287, lng: 127.011, hours: "방문 전 확인", description: "행사 뒤 가볍게 걷기 위한 예시 장소입니다.", sourceUrl: "/about", demo: true },
  { id: "demo-suwon-culture", title: "골목 문화 공간", category: "문화시설 · 예시", address: "경기 수원시 행궁동 일대", lat: 37.284, lng: 127.016, hours: "방문 전 확인", description: "주변 장소를 추가하고 순서를 바꿔 보세요.", sourceUrl: "/about", demo: true },
  { id: "demo-incheon-walk", title: "수변 산책 지점", category: "산책 · 예시", address: "인천 연수구 송도동 일대", lat: 37.3909, lng: 126.642, hours: "방문 전 확인", description: "공연 전후로 들를 수 있는 가상의 방문 후보입니다.", sourceUrl: "/about", demo: true },
  { id: "demo-incheon-culture", title: "공원 옆 문화 공간", category: "문화시설 · 예시", address: "인천 연수구 송도동 일대", lat: 37.396, lng: 126.638, hours: "방문 전 확인", description: "동행에게 보낼 나들이 계획을 완성해 보세요.", sourceUrl: "/about", demo: true },
  { id: "demo-jongno-walk", title: "골목 산책 지점", category: "산책 · 예시", address: "서울 종로구 삼청동 일대", lat: 37.583, lng: 126.983, hours: "방문 전 확인", description: "전시 뒤 주변 골목으로 이어지는 예시입니다.", sourceUrl: "/about", demo: true },
];
