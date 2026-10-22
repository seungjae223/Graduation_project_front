import { sourceSignature } from "./tripOptimizationModel";

// Browser-local cache until the separate server-side optimized-version storage is approved.
// Never alters saved TripPlace order/times; never interprets browser data as authenticated.
const base = (tripId, account) => {
  if (!/^\d+$/.test(String(tripId || "")) || !account || account === "anonymous") return null;
  const principal = String(account).replace(/:session:\d+$/, "");
  let hash = 2166136261;
  for (const char of principal) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `nomango:optimized:v1:${tripId}:${(hash >>> 0).toString(16)}`;
};
export function readOptimizedVersions(tripId, account, places) {
  const key = base(tripId, account);
  if (!key || typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "{}");
    if (parsed?.version !== 1 || !parsed.days || typeof parsed.days !== "object") return {};
    return Object.fromEntries(Object.entries(parsed.days).filter(([day, draft]) => {
      // An optimized draft is its own itinerary. Its original places can later
      // be deleted, reordered or edited without invalidating this saved version.
      const order = draft?.order?.map(String);
      const extras = draft?.addedPlaces || {};
      return /^[1-9]\d*$/.test(day) && Array.isArray(order) && order.length > 0 &&
        order.length < 1000 && new Set(order).size === order.length &&
        order.every(id => /^\d+$/.test(id) || /^opt:\d+:\d+$/.test(id)) &&
        typeof draft.source === "string" && Array.isArray(draft.rows) &&
        Array.isArray(draft.warnings) &&
        order.every(id => !id.startsWith("opt:") || Boolean(extras[id]));
    }).map(([day, draft]) => [day, { ...draft,
      // This is informational ONLY: never prevent editing or opening a draft.
      stale: draft.source !== sourceSignature(
        places.filter(p => String(p.day) === String(day))) }]));
  } catch { return {}; }
}
// A single localStorage write also supports saving optimized additions to several days
// without leaving half the requested days modified when a quota write fails.
export function saveOptimizedDays(tripId, account, places, byDay) {
  const key = base(tripId, account);
  if (!key || typeof window === "undefined") return false;
  try {
    const current = JSON.parse(window.localStorage.getItem(key) || "{}");
    const days = current?.version === 1 && current.days && typeof current.days === "object" ? current.days : {};
    const nextDays = { ...days };
    const updates = Object.entries(byDay || {});
    if (!updates.length) return false;
    for (const [day, draft] of updates) {
      const originals = places.filter(p => Number(p.day) === Number(day));
    const extra = Object.fromEntries(Object.entries(draft?.addedPlaces || {})
      .filter(([key, place]) => /^opt:\d+:\d+$/.test(key) &&
        Number.isSafeInteger(Number(place?.placeId)) && Number(place.placeId) > 0 &&
        String(place?.placeName || "").trim()));
    if (!Array.isArray(draft?.order) || !draft.order.length || draft.order.length > 999 ||
      new Set(draft.order.map(String)).size !== draft.order.length ||
      draft.order.some(id => !/^\d+$/.test(String(id)) && !extra[String(id)])) return false;
    const snapshotPlaces = { ...(draft.sourcePlaces || {}) };
    // Capture the original place as it was when optimization was first created.
    // Never overwrite this snapshot with later edits to the manual itinerary.
    for (const place of originals) {
      const id = String(place.tripPlaceId ?? place.id);
      if (!(id in snapshotPlaces)) snapshotPlaces[id] = { ...place };
    }
    for (const id of draft.order.map(String)) {
      if (id.startsWith("opt:") || snapshotPlaces[id]) continue;
      // Backwards compatibility: older local drafts had no source snapshot.
      const known = originals.find(p => String(p.tripPlaceId ?? p.id) === id);
      const row = draft.rows?.find(item => String(item.id) === id);
      snapshotPlaces[id] = known ? { ...known } : {
        tripPlaceId: id, placeName: row?.name || "이전 일정의 장소",
        placeId: null, arrivalTime: "", stayDuration: 0, memo: "",
      };
    }
    const allowed = new Set([...Object.keys(snapshotPlaces), ...Object.keys(extra)]);
    const snapshot = {
      order: draft.order.map(String),
      addedPlaces: extra,
      source: typeof draft.source === "string" ? draft.source : sourceSignature(originals),
      sourcePlaces: snapshotPlaces,
      rows: draft.rows.map(row => ({ ...row })),
      warnings: [...draft.warnings],
      mode: draft.mode === "careful" || draft.mode === "quick" ? draft.mode : "unknown",
      memoOverrides: Object.fromEntries(Object.entries(draft.memoOverrides || {})
        .filter(([id, memo]) => allowed.has(String(id)) &&
          typeof memo === "string")
        .map(([id, memo]) => [id, memo.slice(0, 500)])),
      manuallyEdited: draft.manuallyEdited === true,
      stayOverrides: Object.fromEntries(Object.entries(draft.stayOverrides || {})
        .filter(([id, minutes]) => allowed.has(String(id)) &&
          Number.isSafeInteger(Number(minutes)) && Number(minutes) >= 0 && Number(minutes) <= 1440)
        .map(([id, minutes]) => [id, Number(minutes)])),
      createdAt: draft.createdAt || new Date().toISOString(),
    };
      nextDays[day] = snapshot;
    }
    window.localStorage.setItem(key, JSON.stringify({ version: 1, days: nextDays }));
    return true;
  } catch { return false; }
}
export function saveOptimizedDay(tripId, account, places, day, draft) {
  return saveOptimizedDays(tripId, account, places, { [day]: draft });
}
