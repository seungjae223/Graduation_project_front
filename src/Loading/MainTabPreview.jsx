const tabPreviews = {
  "/home": { title: "다음 여행, 어디로 갈까요?", caption: "당신만을 위한 여행을 계획해 보세요." },
  "/search": { title: "무엇을 검색할까요?", search: true },
  "/schedule": { title: "내 여행 일정", caption: "준비 중인 여행을 한눈에 확인하세요." },
  "/mypage": { title: "마이페이지" },
};

export default function MainTabPreview({ path }) {
  const preview = tabPreviews[path];
  if (!preview) return null;

  return <div className="main-tab-preview" aria-hidden="true">
    <h1>{preview.title}</h1>
    {preview.caption && <p>{preview.caption}</p>}
    {preview.search && <div className="main-tab-preview-search">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4.5 4.5" />
      </svg>
      <span>장소, 도시 또는 테마 검색</span>
    </div>}
  </div>;
}
