// Browser-local display preferences are separate from editable optimized drafts.
// Scope them by trip and account; a signed-out visitor must not reuse an account's choice.
export const DEFAULT_TRIP_DISPLAY = Object.freeze({ view: "list", version: "manual" });

const preferenceKey = (tripId, account) => {
  if (!/^[1-9]\d*$/.test(String(tripId || "")) || !account || account === "anonymous") return null;
  const principal = String(account).replace(/:session:\d+$/, "");
  let hash = 2166136261;
  for (const char of principal) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `nomango:trip-display:v1:${tripId}:${(hash >>> 0).toString(16)}`;
};

export function readTripDisplayPreferences(tripId, account) {
  const key = preferenceKey(tripId, account);
  if (!key || typeof window === "undefined") return { ...DEFAULT_TRIP_DISPLAY };
  try {
    const saved = JSON.parse(window.localStorage.getItem(key) || "null");
    return {
      view: saved?.view === "tabs" ? "tabs" : "list",
      version: saved?.version === "optimized" ? "optimized" : "manual",
    };
  } catch {
    return { ...DEFAULT_TRIP_DISPLAY };
  }
}

export function saveTripDisplayPreferences(tripId, account, changes) {
  const key = preferenceKey(tripId, account);
  if (!key || typeof window === "undefined") return false;
  const previous = readTripDisplayPreferences(tripId, account);
  const next = {
    view: changes?.view === "list" || changes?.view === "tabs" ? changes.view : previous.view,
    version: changes?.version === "manual" || changes?.version === "optimized"
      ? changes.version : previous.version,
  };
  try {
    window.localStorage.setItem(key, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}
