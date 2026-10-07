import tokyo from "../img/도쿄.png";
import kyoto from "../img/교토.png";
import beach from "../img/서비스 소개 .png";

// Reuse existing assets; no new images or external image requests.
export function seedPlaces() {
  const rows = [
    ["경복궁", "서울특별시 종로구 사직로 161", "서울", "photo", 37.5796, 126.977, tokyo],
    ["남산서울타워", "서울특별시 용산구 남산공원길 105", "서울", "photo", 37.5512, 126.9882, tokyo],
    ["서울숲", "서울특별시 성동구 뚝섬로 273", "서울", "healing", 37.5445, 127.0374, kyoto],
    ["북촌한옥마을", "서울특별시 종로구 계동길 37", "서울", "photo", 37.5826, 126.983, tokyo],
    ["광장시장", "서울특별시 종로구 창경궁로 88", "서울", "food", 37.5701, 126.9997, tokyo],
    ["롯데월드", "서울특별시 송파구 올림픽로 240", "서울", "activity", 37.511, 127.098, tokyo],
    ["사려니숲길", "제주특별자치도 제주시 조천읍 비자림로", "제주", "healing", 33.408, 126.639, kyoto],
    ["협재해수욕장", "제주특별자치도 제주시 한림읍 한림로 329-10", "제주", "photo", 33.394, 126.239, beach],
    ["성산일출봉", "제주특별자치도 서귀포시 성산읍 일출로 284-12", "제주", "activity", 33.458, 126.942, beach],
    ["해운대해수욕장", "부산광역시 해운대구 해운대해변로 264", "부산", "healing", 35.1587, 129.1604, beach],
    ["감천문화마을", "부산광역시 사하구 감내2로 203", "부산", "photo", 35.0975, 129.0106, tokyo],
    ["죽녹원", "전라남도 담양군 담양읍 죽녹원로 119", "담양", "healing", 35.326, 126.99, kyoto],
    ["제주 동문시장", "제주특별자치도 제주시 관덕로14길 20", "제주", "food", 33.511, 126.526, tokyo],
    ["부산 국제시장", "부산광역시 중구 신창동4가", "부산", "food", 35.101, 129.028, tokyo],
    ["도쿄 신주쿠 교엔", "일본 도쿄 신주쿠구 나이토마치 11", "도쿄", "healing", 35.685, 139.71, tokyo],
    ["도쿄 센소지", "일본 도쿄 다이토구 아사쿠사 2-3-1", "도쿄", "photo", 35.7148, 139.7967, tokyo],
    ["도쿄 츠키지 시장", "일본 도쿄 주오구 쓰키지 4", "도쿄", "food", 35.665, 139.77, tokyo],
    ["도쿄 스카이트리", "일본 도쿄 스미다구 오시아게 1-1-2", "도쿄", "activity", 35.71, 139.81, tokyo],
    ["교토 아라시야마", "일본 교토 우쿄구 사가텐류지", "교토", "healing", 35.009, 135.667, kyoto],
    ["오사카 도톤보리", "일본 오사카 주오구 도톤보리", "오사카", "food", 34.669, 135.501, tokyo],
    ["나라 공원", "일본 나라시 조시초", "나라", "healing", 34.685, 135.843, kyoto],
    ["후쿠오카 오호리 공원", "일본 후쿠오카 주오구 오호리코엔", "후쿠오카", "healing", 33.585, 130.376, kyoto],
    ["삿포로 오도리 공원", "일본 삿포로 주오구 오도리니시", "삿포로", "healing", 43.06, 141.354, kyoto],
  ];
  return rows.map(([name, address, region, theme, latitude, longitude, imageUrl], i) => ({
    id: i + 1, name, address, region, theme, latitude, longitude, imageUrl,
    placeType: theme === "food" ? "RESTAURANT" : "ATTRACTION",
    description: `${name}에서 여유롭게 여행을 즐겨보세요.`,
    tags: [region, { healing: "힐링", photo: "사진", food: "맛집", activity: "액티비티" }[theme]],
    rating: 4.5 + (i % 5) / 10, reviewCount: 6,
  }));
}
export const searchText = value => String(value || "").toLowerCase().replace(/\s+/g, "");
export const themeKey = value => ({ "힐링": "healing", "액티비티": "activity", "맛집": "food", "사진": "photo", "포토": "photo", "인생샷": "photo" }[value] || value);
