import { getPlaceCountry } from "./placeCountry";

// Open the selected place in the appropriate native-map-capable website.
// Do not guess whether an unknown region belongs to Korea or overseas.
export function getPlaceDirections(place) {
  const country = getPlaceCountry(place);
  const name = String(place?.name || place?.title || "").trim();
  const address = String(place?.address || "").trim();
  if (!country || !name) return null;

  const latitude = Number(place?.latitude);
  const longitude = Number(place?.longitude);
  const hasCoordinates = place?.latitude != null && place?.longitude != null &&
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180 &&
    !(latitude === 0 && longitude === 0);

  if (country === "한국") {
    return {
      provider: "kakao",
      url: hasCoordinates
        ? `https://map.kakao.com/link/to/${encodeURIComponent(name)},${latitude},${longitude}`
        : `https://map.kakao.com/link/search/${encodeURIComponent([name, address].filter(Boolean).join(" "))}`,
    };
  }
  const destination = hasCoordinates ? `${latitude},${longitude}` : [name, address].filter(Boolean).join(" ");
  return {
    provider: "google",
    url: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
  };
}
