const number = value => {
  if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") return null;
  return Number.isFinite(Number(value)) ? Number(value) : null;
};

export function readCoordinates(place) {
  const latitude = number(place?.latitude), longitude = number(place?.longitude);
  return latitude !== null && longitude !== null && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? { latitude, longitude } : null;
}

export function distanceBetweenKm(origin, place) {
  const from = readCoordinates(origin), to = readCoordinates(place);
  if (!from || !to) return null;
  const rad = Math.PI / 180;
  const a = Math.sin((to.latitude - from.latitude) * rad / 2) ** 2 +
    Math.cos(from.latitude * rad) * Math.cos(to.latitude * rad) * Math.sin((to.longitude - from.longitude) * rad / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

export function sortPlacesByDistance(places, origin) {
  return places.map((place, index) => ({ place: { ...place, distanceKm: distanceBetweenKm(origin, place) }, index }))
    .sort((a, b) => a.place.distanceKm === null ? b.place.distanceKm === null ? a.index - b.index : 1
      : b.place.distanceKm === null ? -1 : a.place.distanceKm - b.place.distanceKm || a.index - b.index)
    .map(item => item.place);
}

export const validRating = value => {
  const rating = number(value);
  return rating !== null && rating >= 0 && rating <= 5 ? rating : null;
};

export function summarizeReviews(reviews) {
  if (!Array.isArray(reviews)) throw new Error("전체 리뷰 응답을 확인할 수 없습니다.");
  const ratings = reviews.map(review => validRating(review.rating)).filter(rating => rating !== null);
  return { rating: ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null, reviewCount: ratings.length };
}

// Only documented per-place reviews are fetched; no fabricated aggregate fields.
export async function fetchReviewRatings(places, getReviews, signal) {
  const result = {};
  let cursor = 0, failed = false;
  const worker = async () => {
    while (cursor < places.length && !failed && !signal?.aborted) {
      const place = places[cursor++];
      try {
        const providedRating = validRating(place.rating);
        result[place.id] = providedRating !== null ? { rating: providedRating }
          : summarizeReviews(await getReviews(place.id, signal));
      } catch (error) { failed = true; throw error; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, places.length) }, worker));
  if (signal?.aborted) throw new DOMException("조회 취소", "AbortError");
  return result;
}

export function sortPlacesByRating(places, ratings) {
  return places.map((place, index) => ({ place: { ...place, rating: ratings?.[place.id]?.rating ?? validRating(place.rating) }, index }))
    .sort((a, b) => a.place.rating === null ? b.place.rating === null ? a.index - b.index : 1
      : b.place.rating === null ? -1 : b.place.rating - a.place.rating || a.index - b.index)
    .map(item => item.place);
}

export const formatDistance = value => !Number.isFinite(value) ? "거리 정보 없음" :
  value < 1 ? `${Math.round(value * 1000)}m` : `${value.toFixed(1)}km`;
