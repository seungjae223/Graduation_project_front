export function seedReviews(places) {
  const comments = ["산책하기 좋고 주변 풍경이 예뻐요.", "친구들과 즐거운 시간을 보냈어요.", "오전에 방문하니 여유롭게 둘러볼 수 있었어요.", "다음 여행에도 다시 방문하고 싶어요.", "주변 볼거리까지 함께 즐기기 좋아요.", "사진 찍기 좋은 장소가 많아요."];
  return places.flatMap(place => comments.map((comment, i) => ({
    id: place.id * 10 + i, placeId: place.id, nickname: ["주말여행자", "산책하는나무", "여행기록"][i % 3],
    comment, rating: i % 3 === 0 ? 4 : 5, createdAt: "2026-10-01T10:00:00",
  })));
}
