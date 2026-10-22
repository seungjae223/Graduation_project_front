// V16.4 trip detail read model. Uses only server-owned records; no demo itinerary.
export function tripDays(trip, places = [], timelines = {}) {
  const first = String(trip?.startDate || "");
  const last = String(trip?.endDate || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(first) || !/^\d{4}-\d{2}-\d{2}$/.test(last)) return [];
  const start = Date.parse(first + "T00:00:00Z");
  const end = Date.parse(last + "T00:00:00Z");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start ||
      new Date(start).toISOString().slice(0, 10) !== first ||
      new Date(end).toISOString().slice(0, 10) !== last) return [];
  const count = Math.round((end - start) / 86400000) + 1;
  if (count > 366) return [];
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(start + i * 86400000);
    const matches = places.filter(place => Number(place.day) === i + 1)
      .sort((a, b) => Number(a.visitOrder) - Number(b.visitOrder));
    const timeline = timelines[i + 1];
    return {
      day: i + 1,
      label: (i + 1) + "일차",
      dateLabel: (date.getUTCMonth() + 1) + "." + date.getUTCDate(),
      places: matches,
      timeline,
    };
  });
}
// All trips start as a list when there is no stored display preference.
export const defaultDetailView = () => "list";
export const formatTripDate = date => String(date || "").replace(/-/g, ".");
export function tripStayLabel(count) {
  return count > 0 ? (count - 1) + "박 " + count + "일" : "";
}
export const hasTripStart = trip => Number.isFinite(Number(trip?.latitude)) &&
  Number.isFinite(Number(trip?.longitude)) && trip?.latitude != null && trip?.longitude != null;
export const mayOptimizeDay = (trip, day) => day.places.length >= 2 &&
  (hasTripStart(trip) || day.places.some(place => place.isStartPoint === true));
