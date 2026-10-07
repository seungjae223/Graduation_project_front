export function makeTripPlace(place, tripId, id, day, visitOrder) {
  return { id, tripPlaceId: id, tripId, placeId: place.id, placeName: place.name,
    address: place.address, latitude: place.latitude, longitude: place.longitude, placeType: place.placeType,
    imageUrl: place.imageUrl, day, visitOrder, isStartPoint: visitOrder === 1,
    arrivalTime: "", departureTime: "", stayDuration: 60, isFixed: false, isNextDay: false, memo: "" };
}
export function seedSchedules(places) {
  const trips = [
    { id: 1, title: "서울 주말 여행", destination: "서울", startDate: "2026-10-10", endDate: "2026-10-11" },
    { id: 2, title: "제주 힐링 여행", destination: "제주", startDate: "2026-10-15", endDate: "2026-10-16" },
    { id: 3, title: "부산 바다 여행", destination: "부산", startDate: "2026-10-20", endDate: "2026-10-20" },
  ].map(trip => ({ ...trip, latitude: 37.5665, longitude: 126.978, createdAt: "2026-10-01T10:00:00" }));
  const selections = [[1, 1, 1], [1, 4, 1], [1, 5, 2], [1, 3, 2], [2, 7, 1], [2, 8, 1], [2, 9, 2], [2, 13, 2], [3, 10, 1], [3, 11, 1], [3, 14, 1]];
  const orders = {};
  const tripPlaces = selections.map(([tripId, placeId, day], i) => {
    const key = `${tripId}:${day}`;
    orders[key] = (orders[key] || 0) + 1;
    return makeTripPlace(places.find(place => place.id === placeId), tripId, i + 1, day, orders[key]);
  });
  return { trips, tripPlaces };
}

const minutes = time => {
  const [hour, minute] = String(time || "10:00").split(":").map(Number);
  return hour * 60 + minute;
};
const clock = value => `${String(Math.floor(value / 60) % 24).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
export function buildTimeline(trip, places, startTime = "10:00") {
  let cursor = minutes(startTime);
  const dateTime = (day, value) => {
    const date = new Date(`${trip.startDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + day - 1 + Math.floor(value / 1440));
    return `${date.toISOString().slice(0, 10)}T${clock(value)}:00`;
  };
  return [...places].sort((a, b) => a.visitOrder - b.visitOrder).map((place, index) => {
    const travel = index ? 20 : 0;
    const arrival = place.isFixed && place.arrivalTime ? minutes(place.arrivalTime) + (place.isNextDay ? 1440 : 0) : cursor + travel;
    const departure = arrival + (place.stayDuration ?? 60);
    cursor = departure;
    return { visitOrder: place.visitOrder, placeName: place.placeName, placeType: place.placeType,
      arrivalTime: clock(arrival), departureTime: clock(departure),
      arrivalDateTime: dateTime(place.day, arrival), departureDateTime: dateTime(place.day, departure),
      arrivalDayOffset: Math.floor(arrival / 1440), departureDayOffset: Math.floor(departure / 1440),
      stayMinutes: place.stayDuration ?? 60, travelMinutesFromPrevious: travel };
  });
}
