export function seedInquiries() {
  return [
    { id: 1, title: "여행 일정 저장 문의", content: "저장한 일정은 어디에서 확인할 수 있나요?", answer: "마이페이지의 내 일정에서 확인하실 수 있습니다.", answered: true, status: "answered" },
    { id: 2, title: "장소 추천 문의", content: "제주도의 산책 장소를 추천받고 싶어요.", answer: "", answered: false, status: "waiting" },
  ].map(inquiry => ({ ...inquiry, userEmail: "test@example.com", nickname: "테스트 사용자", createdAt: "2026-10-01T10:00:00" }));
}
