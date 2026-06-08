import api from "./api";

const TRIP_BASE_URL = "/api/trips";

const DEFAULT_COORDS = {
  latitude: 37.5665,
  longitude: 126.978,
};

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.trips)) return data.trips;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.places)) return data.places;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.results)) return data.results;

  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.places)) return data.data.places;
  if (Array.isArray(data?.data?.trips)) return data.data.trips;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.results)) return data.data.results;

  return [];
};

const unwrapData = (data) => {
  return data?.data || data?.trip || data?.tripPlace || data?.result || data;
};

const assertPositiveInteger = (value, message) => {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(message);
  }

  return numberValue;
};

const formatDateKey = (date) => {
  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDatesInRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [];
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const from = start <= end ? start : end;
  const to = start <= end ? end : start;

  const dates = [];
  const current = new Date(from);

  while (current <= to) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const getAllPlaces = (placesByDate = {}) => {
  return Object.values(placesByDate).flatMap((places) =>
    Array.isArray(places) ? places : []
  );
};

const getFirstPlaceCoordinate = (places = []) => {
  const place = places.find((item) => {
    return item?.latitude || item?.lat || item?.longitude || item?.lng;
  });

  if (!place) {
    return DEFAULT_COORDS;
  }

  return {
    latitude: Number(place.latitude ?? place.lat ?? DEFAULT_COORDS.latitude),
    longitude: Number(place.longitude ?? place.lng ?? DEFAULT_COORDS.longitude),
  };
};

export const createTripApi = async (tripRequest) => {
  const response = await api.post(TRIP_BASE_URL, tripRequest);
  return unwrapData(response.data);
};

export const updateTripApi = async (id, tripRequest) => {
  const tripId = assertPositiveInteger(id, "수정할 여행 id가 필요합니다.");

  const response = await api.put(`${TRIP_BASE_URL}/${tripId}`, tripRequest);
  return unwrapData(response.data);
};

export const getTripsApi = async () => {
  const response = await api.get(TRIP_BASE_URL);
  return normalizeList(response.data);
};

export const getTripByIdApi = async (id) => {
  const tripId = assertPositiveInteger(id, "여행 id가 필요합니다.");

  const response = await api.get(`${TRIP_BASE_URL}/${tripId}`);
  return unwrapData(response.data);
};

export const getTripPlacesApi = async (tripId) => {
  if (!tripId) return [];

  try {
    const safeTripId = assertPositiveInteger(tripId, "여행 id가 필요합니다.");

    const response = await api.get(`${TRIP_BASE_URL}/${safeTripId}/places`);
    return normalizeList(response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      return [];
    }

    throw error;
  }
};

export const getTripDayPlacesApi = async ({ tripId, day }) => {
  if (!tripId || !day) return [];

  try {
    const safeTripId = assertPositiveInteger(tripId, "여행 id가 필요합니다.");

    const safeDay = assertPositiveInteger(
      day,
      "조회할 일차 day 값이 필요합니다."
    );

    const response = await api.get(
      `${TRIP_BASE_URL}/${safeTripId}/days/${safeDay}/places`
    );

    return normalizeList(response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      return [];
    }

    throw error;
  }
};

export const addPlaceToTripApi = async ({
  tripId,
  placeId,
  day,
  visitOrder,
}) => {
  const safeTripId = assertPositiveInteger(tripId, "여행 id가 필요합니다.");

  const safePlaceId = assertPositiveInteger(
    placeId,
    "추가할 장소 id가 필요합니다."
  );

  const safeDay = assertPositiveInteger(day, "일차 day 값이 필요합니다.");

  const safeVisitOrder = assertPositiveInteger(
    visitOrder,
    "방문 순서 visitOrder 값이 필요합니다."
  );

  const response = await api.post(
    `${TRIP_BASE_URL}/${safeTripId}/places/${safePlaceId}`,
    null,
    {
      params: {
        day: safeDay,
        visitOrder: safeVisitOrder,
      },
    }
  );

  return unwrapData(response.data);
};

export const setTripStartPlaceApi = async ({
  tripId,
  day,
  tripPlaceId,
}) => {
  const safeTripId = assertPositiveInteger(tripId, "여행 id가 필요합니다.");

  const safeDay = assertPositiveInteger(day, "일차 day 값이 필요합니다.");

  const safeTripPlaceId = assertPositiveInteger(
    tripPlaceId,
    "출발 장소로 지정할 tripPlaceId가 필요합니다."
  );

  const response = await api.post(
    `${TRIP_BASE_URL}/${safeTripId}/days/${safeDay}/places/${safeTripPlaceId}/start`
  );

  return unwrapData(response.data);
};

export const optimizeTripDayApi = async ({ tripId, day }) => {
  const safeTripId = assertPositiveInteger(tripId, "여행 id가 필요합니다.");

  const safeDay = assertPositiveInteger(
    day,
    "최적화할 일차 day 값이 필요합니다."
  );

  const response = await api.post(
    `${TRIP_BASE_URL}/${safeTripId}/days/${safeDay}/optimize`
  );

  return normalizeList(response.data);
};

export const deleteTripApi = async (id) => {
  const tripId = assertPositiveInteger(id, "삭제할 여행 id가 필요합니다.");

  const response = await api.delete(`${TRIP_BASE_URL}/${tripId}`);
  return response.data;
};

export const buildTripRequestFromRouteState = ({
  selectedDates = [],
  placesByDate = {},
}) => {
  const firstDate = selectedDates[0];
  const lastDate = selectedDates[selectedDates.length - 1];

  const startDate = formatDateKey(firstDate);
  const endDate = formatDateKey(lastDate || firstDate);

  const allPlaces = getAllPlaces(placesByDate);
  const firstPlace = allPlaces[0];

  const { latitude, longitude } = getFirstPlaceCoordinate(allPlaces);

  return {
    title: firstPlace
      ? `${firstPlace.name} 여행 일정`
      : `${startDate || "새로운"} 여행 일정`,
    destination: firstPlace?.name || "서울",
    startDate,
    endDate,
    latitude,
    longitude,
  };
};

export const mapTripToSavedRoute = (
  trip,
  tripPlaces = [],
  fallbackRoute = {}
) => {
  const startDate = trip?.startDate || fallbackRoute?.startDate;
  const endDate = trip?.endDate || fallbackRoute?.endDate || startDate;

  const selectedDates =
    fallbackRoute?.selectedDates?.length > 0
      ? fallbackRoute.selectedDates
      : getDatesInRange(startDate, endDate).map((date) => date.toISOString());

  const placesByDate = {};

  selectedDates.forEach((isoDate, index) => {
    const dateKey = formatDateKey(isoDate);
    const dayNumber = index + 1;

    const placesForDay = tripPlaces
      .filter((place) => Number(place.day || 1) === dayNumber)
      .sort((a, b) => Number(a.visitOrder || 0) - Number(b.visitOrder || 0))
      .map((place) => ({
        id: String(place.id ?? `${trip?.id}-${place.placeId}-${place.visitOrder}`),
        sourceId: String(place.placeId ?? place.id ?? place.placeName),
        originalId: place.placeId ?? place.id ?? null,
        placeId: place.placeId ?? null,
        serverTripPlaceId: place.id ?? place.tripPlaceId ?? null,
        name: place.placeName || place.name || "장소명 없음",
        desc: place.address || "",
        address: place.address || "",
        latitude: place.latitude,
        longitude: place.longitude,
        placeType: place.placeType,
        visitOrder: place.visitOrder || 0,
        timeLabel: "",
        isFixedTime: false,
        isStartPoint: Boolean(place.isStartPoint),
      }));

    placesByDate[dateKey] =
      placesForDay.length > 0
        ? placesForDay
        : fallbackRoute?.placesByDate?.[dateKey] || [];
  });

  const totalPlaces = Object.values(placesByDate).reduce(
    (sum, places) => sum + places.length,
    0
  );

  return {
    ...fallbackRoute,
    id: String(trip?.id ?? fallbackRoute?.id ?? Date.now()),
    title: trip?.title || fallbackRoute?.title || "여행 일정",
    destination: trip?.destination || fallbackRoute?.destination || "",
    startDate,
    endDate,
    mapType: trip?.mapType || fallbackRoute?.mapType || "",
    mapProvider: trip?.mapType || fallbackRoute?.mapProvider || "",
    routeUrl: trip?.routeUrl || fallbackRoute?.routeUrl || "",
    createdAt: fallbackRoute?.createdAt || new Date().toISOString(),
    selectedDates,
    placesByDate,
    summary: {
      daysCount: selectedDates.length,
      totalPlaces,
      dateRangeText:
        startDate && endDate
          ? `${startDate.slice(5).replace("-", "/")} ~ ${endDate
              .slice(5)
              .replace("-", "/")}`
          : "",
    },
  };
};