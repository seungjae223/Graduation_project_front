// Optional per-day departure/arrival preferences are browser-local in V16.5.
// They are not server trip-place fields; never claim cross-device persistence.
function key(tripId, account, day) {
  if (!/^\d+$/.test(String(tripId || "")) || !/^\d+$/.test(String(day || "")) ||
      !account || account === "anonymous") return null;
  const principal = String(account).replace(/:session:\d+$/, "");
  let hash = 2166136261;
  for (const c of principal) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return `nomango:day-times:v1:${tripId}:${day}:${(hash >>> 0).toString(16)}`;
}
const valid = value => value === "" || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value));
export function readDayTimes(tripId, account, day) {
  const storageKey = key(tripId, account, day);
  if (!storageKey || typeof window === "undefined") return { startTime: "", endTime: "" };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    return { startTime: valid(parsed.startTime) ? (parsed.startTime || "") : "",
      endTime: valid(parsed.endTime) ? (parsed.endTime || "") : "" };
  } catch { return { startTime: "", endTime: "" }; }
}
export function saveDayTimes(tripId, account, day, times) {
  const storageKey = key(tripId, account, day);
  if (!storageKey || typeof window === "undefined" || !valid(times.startTime) || !valid(times.endTime)) return false;
  try { window.localStorage.setItem(storageKey, JSON.stringify({ startTime: times.startTime || "", endTime: times.endTime || "" })); return true; }
  catch { return false; }
}
