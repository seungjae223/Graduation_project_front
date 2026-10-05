// A 200 HTML/login page or malformed body must never become an empty result.
export function requireList(data) {
  if (Array.isArray(data)) return data;
  for (const key of ["data", "content", "items", "trips", "places", "tripPlaces", "result"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  throw new Error("조회 응답 형식을 확인할 수 없습니다.");
}

export function requireTrip(data, id) {
  const trip = data?.data ?? data?.trip ?? data?.result ?? data;
  if (!trip || typeof trip !== "object" || Array.isArray(trip) ||
      String(trip.id ?? trip.tripId) !== String(id) ||
      !trip.startDate || !trip.endDate ||
      !Number.isFinite(Date.parse(trip.startDate)) ||
      !Number.isFinite(Date.parse(trip.endDate)) ||
      Date.parse(trip.endDate) < Date.parse(trip.startDate)) {
    throw new Error("일정 조회 응답을 확인할 수 없습니다.");
  }
  return trip;
}
