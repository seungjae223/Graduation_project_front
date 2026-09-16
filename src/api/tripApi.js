import api from "./api";

const TRIP_BASE_URL = "/api/trips";

const DEFAULT_COORDS = {
  latitude: 37.5665,
  longitude: 126.978,
};

const DEFAULT_START_TIME = "09:00";

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.trips)) return data.trips;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.places)) return data.places;
  if (Array.isArray(data?.tripPlaces)) return data.tripPlaces;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.response)) return data.response;

  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.places)) return data.data.places;
  if (Array.isArray(data?.data?.trips)) return data.data.trips;
  if (Array.isArray(data?.data?.tripPlaces)) return data.data.tripPlaces;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.results)) return data.data.results;
  if (Array.isArray(data?.data?.response)) return data.data.response;

  return [];
};

const unwrapData = (data) => {
  return (
    data?.data ??
    data?.trip ??
    data?.tripPlace ??
    data?.result ??
    data?.response ??
    data
  );
};

const assertPositiveInteger = (value, message) => {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(message);
  }

  return numberValue;
};

const toNumber = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    const numberValue = Number(value);

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return null;
};

const toNumberOrDefault = (value, defaultValue) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : defaultValue;
};

const toBoolean = (value) => {
  return value === true || value === "true" || value === 1 || value === "1";
};

const padTime = (value) => String(value).padStart(2, "0");

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

const getTodayDateKey = () => {
  return formatDateKey(new Date());
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
  const placeWithCoordinate = places.find((item) => {
    const latitude = toNumber(item?.latitude, item?.lat, item?.y);
    const longitude = toNumber(item?.longitude, item?.lng, item?.lon, item?.x);

    return Number.isFinite(latitude) && Number.isFinite(longitude);
  });

  if (!placeWithCoordinate) {
    return DEFAULT_COORDS;
  }

  return {
    latitude: toNumberOrDefault(
      placeWithCoordinate.latitude ??
        placeWithCoordinate.lat ??
        placeWithCoordinate.y,
      DEFAULT_COORDS.latitude
    ),
    longitude: toNumberOrDefault(
      placeWithCoordinate.longitude ??
        placeWithCoordinate.lng ??
        placeWithCoordinate.lon ??
        placeWithCoordinate.x,
      DEFAULT_COORDS.longitude
    ),
  };
};

const normalizeTimeValue = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  const hour = Number(value.hour);
  const minute = Number(value.minute);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return "";
  }

  return `${padTime(hour)}:${padTime(minute)}`;
};

const toDisplayTimeLabel = (value) => {
  const rawTime = normalizeTimeValue(value);

  if (!rawTime) return "";

  if (/am|pm/i.test(rawTime)) {
    return rawTime;
  }

  const match = rawTime.match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return rawTime;
  }

  const hour24 = Number(match[1]);
  const minute = Number(match[2]);

  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) {
    return rawTime;
  }

  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return `${padTime(hour12)}:${padTime(minute)} ${period}`;
};

const normalizeTripRequest = (tripRequest = {}) => {
  const today = getTodayDateKey();

  const startDate =
    formatDateKey(
      tripRequest.startDate ||
        tripRequest.selectedDates?.[0] ||
        tripRequest.date ||
        today
    ) || today;

  const endDate =
    formatDateKey(
      tripRequest.endDate ||
        tripRequest.selectedDates?.[tripRequest.selectedDates.length - 1] ||
        tripRequest.lastDate ||
        startDate
    ) || startDate;

  return {
    title: String(tripRequest.title || "여행 일정").trim(),
    destination: String(tripRequest.destination || "서울").trim(),
    startDate,
    endDate,
    latitude: toNumberOrDefault(
      tripRequest.latitude ?? tripRequest.lat,
      DEFAULT_COORDS.latitude
    ),
    longitude: toNumberOrDefault(
      tripRequest.longitude ?? tripRequest.lng ?? tripRequest.lon,
      DEFAULT_COORDS.longitude
    ),
  };
};

export const normalizeTrip = (trip = {}) => {
  return {
    ...trip,
    id: trip.id ?? trip.tripId ?? trip.routeId,
    title: trip.title || "여행 일정",
    destination: trip.destination || "",
    startDate: trip.startDate || "",
    endDate: trip.endDate || trip.startDate || "",
    mapType: trip.mapType || trip.mapProvider || trip.provider || "",
    routeUrl: trip.routeUrl || trip.mapUrl || trip.url || "",
  };
};

export const normalizeTripPlace = (place = {}, fallbackDay = 1) => {
  const latitude = toNumber(
    place.latitude,
    place.lat,
    place.y,
    place.placeLatitude,
    place.placeLat,
    place.mapY
  );

  const longitude = toNumber(
    place.longitude,
    place.lng,
    place.lon,
    place.x,
    place.placeLongitude,
    place.placeLng,
    place.placeLon,
    place.mapX
  );

  const day = toNumber(place.day, place.dayNumber, fallbackDay) || fallbackDay;

  const visitOrder =
    toNumber(place.visitOrder, place.order, place.sequence, place.sortOrder) ||
    0;

  const arrivalTime = normalizeTimeValue(place.arrivalTime);
  const departureTime = normalizeTimeValue(place.departureTime);

  return {
    ...place,
    id: place.id ?? place.tripPlaceId,
    tripId: place.tripId,
    tripPlaceId: place.tripPlaceId ?? place.id,
    placeId: place.placeId,
    placeName:
      place.placeName ||
      place.name ||
      place.title ||
      place.destinationName ||
      "장소명 없음",
    latitude,
    longitude,
    address: place.address || place.roadAddress || place.location || "",
    placeType: place.placeType || place.category || place.categoryName || "",
    day,
    visitOrder,
    isStartPoint: toBoolean(place.isStartPoint ?? place.startPoint),
    arrivalTime,
    departureTime,
    stayDuration: toNumber(place.stayDuration, place.stayMinutes, 0) || 0,
    isFixed: toBoolean(place.isFixed ?? place.fixed),
    memo: place.memo || place.memoText || place.note || place.notes || "",
  };
};

export const normalizeTimelineItem = (item = {}) => {
  return {
    visitOrder: item.visitOrder ?? 0,
    placeName: item.placeName || item.name || "장소명 없음",
    placeType: item.placeType || "",
    arrivalTime: item.arrivalTime || "",
    departureTime: item.departureTime || "",
    stayMinutes: item.stayMinutes ?? item.stayDuration ?? 0,
    travelMinutesFromPrevious: item.travelMinutesFromPrevious ?? 0,
  };
};

export const createTripApi = async (tripRequest) => {
  const response = await api.post(
    TRIP_BASE_URL,
    normalizeTripRequest(tripRequest)
  );

  return normalizeTrip(unwrapData(response.data));
};

export const updateTripApi = async (id, tripRequest) => {
  const tripId = assertPositiveInteger(id, "수정할 여행 id가 필요합니다.");

  const response = await api.put(
    `${TRIP_BASE_URL}/${tripId}`,
    normalizeTripRequest(tripRequest)
  );

  return normalizeTrip(unwrapData(response.data));
};

export const getTripsApi = async () => {
  const response = await api.get(TRIP_BASE_URL);

  return normalizeList(response.data).map(normalizeTrip);
};

export const getTripByIdApi = async (id) => {
  const tripId = assertPositiveInteger(id, "여행 id가 필요합니다.");

  const response = await api.get(`${TRIP_BASE_URL}/${tripId}`);

  return normalizeTrip(unwrapData(response.data));
};

export const getTripPlacesApi = async (tripId) => {
  if (!tripId) return [];

  try {
    const safeTripId = assertPositiveInteger(tripId, "여행 id가 필요합니다.");

    const response = await api.get(`${TRIP_BASE_URL}/${safeTripId}/places`);

    return normalizeList(response.data).map((place) =>
      normalizeTripPlace(place)
    );
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

    return normalizeList(response.data).map((place) =>
      normalizeTripPlace(place, safeDay)
    );
  } catch (error) {
    if (error.response?.status === 404) {
      return [];
    }

    throw error;
  }
};

export const getTripTimelineApi = async ({
  tripId,
  day,
  startTime = DEFAULT_START_TIME,
}) => {
  if (!tripId || !day) return [];

  const safeTripId = assertPositiveInteger(tripId, "여행 id가 필요합니다.");

  const safeDay = assertPositiveInteger(
    day,
    "조회할 일차 day 값이 필요합니다."
  );

  const response = await api.get(
    `${TRIP_BASE_URL}/${safeTripId}/days/${safeDay}/timeline`,
    {
      params: {
        startTime,
      },
    }
  );

  return normalizeList(response.data).map(normalizeTimelineItem);
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

  return normalizeTripPlace(unwrapData(response.data), safeDay);
};

export const setTripStartPlaceApi = async ({ tripId, day, tripPlaceId }) => {
  const safeTripId = assertPositiveInteger(tripId, "여행 id가 필요합니다.");

  const safeDay = assertPositiveInteger(day, "일차 day 값이 필요합니다.");

  const safeTripPlaceId = assertPositiveInteger(
    tripPlaceId,
    "출발 장소로 지정할 tripPlaceId가 필요합니다."
  );

  const response = await api.post(
    `${TRIP_BASE_URL}/${safeTripId}/days/${safeDay}/places/${safeTripPlaceId}/start`
  );

  return normalizeTripPlace(unwrapData(response.data), safeDay);
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

  return normalizeList(response.data).map((place) =>
    normalizeTripPlace(place, safeDay)
  );
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
  const today = getTodayDateKey();

  const firstDate = selectedDates[0] || today;
  const lastDate = selectedDates[selectedDates.length - 1] || firstDate;

  const startDate = formatDateKey(firstDate) || today;
  const endDate = formatDateKey(lastDate) || startDate;

  const allPlaces = getAllPlaces(placesByDate);
  const firstPlace = allPlaces[0];

  const { latitude, longitude } = getFirstPlaceCoordinate(allPlaces);

  return {
    title: firstPlace
      ? `${firstPlace.name || firstPlace.placeName || "새로운"} 여행 일정`
      : `${startDate} 여행 일정`,
    destination:
      firstPlace?.city ||
      firstPlace?.region ||
      firstPlace?.country ||
      firstPlace?.destination ||
      firstPlace?.name ||
      firstPlace?.placeName ||
      "서울",
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
  const normalizedTrip = normalizeTrip(trip);

  const startDate =
    normalizedTrip.startDate || fallbackRoute?.startDate || getTodayDateKey();

  const endDate =
    normalizedTrip.endDate || fallbackRoute?.endDate || startDate;

  const selectedDates =
    fallbackRoute?.selectedDates?.length > 0
      ? fallbackRoute.selectedDates
      : getDatesInRange(startDate, endDate).map((date) => date.toISOString());

  const normalizedTripPlaces = tripPlaces.map((place) =>
    normalizeTripPlace(place)
  );

  const placesByDate = {};

  selectedDates.forEach((isoDate, index) => {
    const dateKey = formatDateKey(isoDate);
    const dayNumber = index + 1;

    const placesForDay = normalizedTripPlaces
      .filter((place) => Number(place.day || 1) === dayNumber)
      .sort((a, b) => Number(a.visitOrder || 0) - Number(b.visitOrder || 0))
      .map((place) => {
        const tripPlaceId = place.tripPlaceId ?? place.id ?? null;
        const placeId = place.placeId ?? null;

        return {
          id: String(
            tripPlaceId ??
              `${normalizedTrip.id || "trip"}-${placeId || "place"}-${
                place.visitOrder || 0
              }`
          ),
          sourceId: String(placeId ?? tripPlaceId ?? place.placeName),
          originalId: placeId,
          placeId,
          tripPlaceId,
          serverTripPlaceId: tripPlaceId,
          name: place.placeName || "장소명 없음",
          desc: place.address || "",
          address: place.address || "",
          latitude: place.latitude,
          longitude: place.longitude,
          placeType: place.placeType || "",
          visitOrder: place.visitOrder || 0,
          timeLabel: toDisplayTimeLabel(place.arrivalTime),
          arrivalTime: place.arrivalTime || "",
          departureTime: place.departureTime || "",
          stayDuration: place.stayDuration || 0,
          isFixedTime: Boolean(place.isFixed),
          isFixed: Boolean(place.isFixed),
          isStartPoint: Boolean(place.isStartPoint),
          memo: place.memo || "",
        };
      });

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
    id: String(normalizedTrip.id ?? fallbackRoute?.id ?? Date.now()),
    title: normalizedTrip.title || fallbackRoute?.title || "여행 일정",
    destination:
      normalizedTrip.destination || fallbackRoute?.destination || "",
    startDate,
    endDate,
    mapType: normalizedTrip.mapType || fallbackRoute?.mapType || "",
    mapProvider:
      normalizedTrip.mapType ||
      normalizedTrip.mapProvider ||
      fallbackRoute?.mapProvider ||
      "",
    routeUrl: normalizedTrip.routeUrl || fallbackRoute?.routeUrl || "",
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