const LABELS = {
  ATTRACTION: "관광지", RESTAURANT: "음식점",
};
export function getPlaceTypeLabel(value) {
  const text = String(value ?? "").trim();
  return LABELS[text.toUpperCase()] || (/^[가-힣\s]+$/.test(text) ? text : "장소");
}
