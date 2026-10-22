import { clockLabel, defaultStay, minutesOf, placeKey } from "./tripOptimizationModel";

const rowTypes = new Set(["start", "place", "fixed", "end"]);
export const optimizedRow = (draft, id) => (draft?.rows || []).find(row =>
  rowTypes.has(row.type) && String(row.id) === String(id));
export const optimizedStay = (draft, place) => {
  const id = placeKey(place);
  const override = draft?.stayOverrides?.[id];
  if (Number.isInteger(override) && override >= 0 && override <= 1440) return override;
  const row = optimizedRow(draft, id);
  if (row?.type !== "start" && Number.isInteger(row?.minutes) &&
    row.minutes > 0 && row.minutes <= 1440) return row.minutes;
  return defaultStay(place);
};
export const optimizedTime = (draft, place) => {
  const row = optimizedRow(draft, placeKey(place));
  if (row) return row.time == null ? "" : clockLabel(row.time);
  return place?.arrivalTime ? String(place.arrivalTime).slice(0, 5) : "";
};
export function editOptimizedVisit(draft, place, { time, stay, memo }) {
  if (!draft || !place) return null;
  const id = placeKey(place);
  const mins = Number(stay);
  if (!Number.isSafeInteger(mins) || mins < 0 || mins > 1440 ||
    (time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))) return null;
  const normalizedMemo = String(memo || "").slice(0,500);
  if ((time || "") === optimizedTime(draft,place) &&
      mins === optimizedStay(draft,place) &&
      normalizedMemo === (draft.memoOverrides?.[id] ?? place.memo ?? "")) return draft;
  const storedTime = time ? minutesOf(time) : null;
  const rows = [...(draft.rows || [])];
  const index = rows.findIndex(row => rowTypes.has(row.type) && String(row.id) === id);
  const current = index >= 0 ? rows[index] : {
    id, name: place.placeName,
    type: draft.order?.[0] === id ? "start" : "place",
  };
  const updated = {
    ...current, time: storedTime, end: storedTime == null ? null : storedTime + mins,
    minutes: current.type === "start" ? 0 : mins,
  };
  if (index >= 0) rows[index] = updated; else rows.push(updated);
  return {
    ...draft, rows, stayOverrides: { ...(draft.stayOverrides || {}), [id]: mins },
    memoOverrides: { ...(draft.memoOverrides || {}), [id]: normalizedMemo },
    manuallyEdited: true,
  };
}
export function reorderOptimizedVisit(draft, source, target) {
  if (!Array.isArray(draft?.order)) return null;
  const order = draft.order.map(String);
  const from = order.indexOf(String(source)), to = order.indexOf(String(target));
  // Preserve first departure and last arrival anchors.
  if (from < 1 || to < 1 || from >= order.length - 1 || to >= order.length - 1) return null;
  if (from === to) return draft;
  order.splice(to, 0, ...order.splice(from, 1));
  return {...draft, order, manuallyEdited:true};
}
export function moveOptimizedVisit(draft, id, direction) {
  if (![-1, 1].includes(direction)) return null;
  const from = draft?.order?.map(String).indexOf(String(id)) ?? -1;
  return from < 0 ? null : reorderOptimizedVisit(draft, id, draft.order[from + direction]);
}
export function addOptimizedPlace(draft, place) {
  const placeId = Number(place?.id ?? place?.placeId);
  if (!draft || !Number.isSafeInteger(placeId) || placeId <= 0 ||
    !String(place?.name ?? place?.placeName ?? "").trim()) return null;
  const extras = {...(draft.addedPlaces || {})};
  let nonce = Date.now();
  while (extras[`opt:${placeId}:${nonce}`]) nonce += 1;
  const id = `opt:${placeId}:${nonce}`;
  extras[id] = {
    tripPlaceId:id, placeId, placeName:String(place.name ?? place.placeName).slice(0,150),
    region:String(place.region||""), address:String(place.address||""),
    latitude:Number.isFinite(Number(place.latitude)) ? Number(place.latitude) : null,
    longitude:Number.isFinite(Number(place.longitude)) ? Number(place.longitude) : null,
    isFixed:false, isStartPoint:false, stayDuration:0, arrivalTime:"", memo:"",
  };
  // Always insert before the final destination.
  return {...draft,order:[...draft.order.slice(0,-1),id,draft.order[draft.order.length-1]],
    addedPlaces:extras,manuallyEdited:true};
}
export function removeOptimizedPlaces(draft, ids) {
  const removing = new Set(ids.map(String));
  const order = draft?.order?.map(String) || [];
  if (!order.length || removing.has(order[0]) || removing.has(order[order.length-1])) return null;
  const addedPlaces = {...(draft.addedPlaces||{})};
  const rows = (draft.rows||[]).filter(row=>!removing.has(String(row.id)));
  const stayOverrides = {...(draft.stayOverrides||{})};
  const memoOverrides = {...(draft.memoOverrides||{})};
  removing.forEach(id=>{delete addedPlaces[id];delete stayOverrides[id];delete memoOverrides[id];});
  return {...draft,order:order.filter(id=>!removing.has(id)),rows,addedPlaces,
    stayOverrides,memoOverrides,manuallyEdited:true};
}
