const LABELS = {
  LANDMARK: "명소",
  CULTURE: "문화",
  NATURE: "자연",
  FOOD: "맛집",
  SHOPPING: "쇼핑",
  EXPERIENCE: "체험",
  STAY: "숙박",
};

export function getPlaceCategoryLabel(value, fallback = "장소") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;

  return LABELS[text.toUpperCase()] ||
    (/^[가-힣\s]+$/.test(text) ? text : fallback);
}
