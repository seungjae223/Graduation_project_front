// V16.5 read-only itinerary planning. Never invoke the legacy mutating optimize API here.
// This uses the same nearest-neighbour idea as the existing backend, extended with fixed
// time anchors and best insertion; it does NOT claim a globally optimal TSP solution.
export const placeKey = place => String(place?.tripPlaceId ?? place?.id);
const numeric = n => n != null && n !== "" && Number.isFinite(Number(n));
const validCoordinates = p => numeric(p?.latitude) && numeric(p?.longitude) &&
  Math.abs(Number(p.latitude)) <= 90 && Math.abs(Number(p.longitude)) <= 180;

export function distanceKm(a, b) {
  if (!validCoordinates(a) || !validCoordinates(b)) return null;
  const radians = n => Number(n) * Math.PI / 180;
  const lat1 = radians(a.latitude), lat2 = radians(b.latitude);
  const dlat = lat2 - lat1, dlng = radians(b.longitude) - radians(a.longitude);
  const v = Math.sin(dlat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(v), Math.sqrt(Math.max(0, 1 - v)));
}

// V16.5.1 browser-local fallback estimator — NOT map/traffic or a transit ETA.
// Automatically use walking for a <=1.2 km straight-line hop; no user mode selection.
// The detour factors and additive allowances were calibrated against a small Hong Kong
// sample (see docs/DECISIONS.md), with special ferry/tram and unknown-mode trips held out.
// An actual route may be much longer, particularly across waterways or mountains.
export const TRAVEL_ESTIMATE = Object.freeze({
  walkMaxStraightKm: 1.2,
  walkingRouteFactor: 1.65, // mean of 3 observed walking road/straight distance ratios
  walkingSpeedKmh: 5.0,    // approximate pedestrian baseline (not a per-user speed)
  walkingAllowanceMinutes: 1,
  urbanRouteFactor: 1.53, // trimmed mean of 8 ordinary observed road/straight ratios
  urbanSpeedKmh: 30,     // engineering baseline for unlabelled automated urban transport
  urbanAllowanceMinutes: 7, // trimmed mean of observed time residuals
});
export function estimatedMinutes(a, b) {
  const km = distanceKm(a, b);
  if (km === null) return null;
  if (km === 0) return 0;
  const walk = km <= TRAVEL_ESTIMATE.walkMaxStraightKm;
  const factor = walk ? TRAVEL_ESTIMATE.walkingRouteFactor : TRAVEL_ESTIMATE.urbanRouteFactor;
  const speed = walk ? TRAVEL_ESTIMATE.walkingSpeedKmh : TRAVEL_ESTIMATE.urbanSpeedKmh;
  const allowance = walk ? TRAVEL_ESTIMATE.walkingAllowanceMinutes : TRAVEL_ESTIMATE.urbanAllowanceMinutes;
  return Math.max(1, Math.ceil(km * factor / speed * 60 + allowance));
}

export const minutesOf = raw => {
  const match = /^(?:([01]\d|2[0-3])):([0-5]\d)/.exec(String(raw || ""));
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};
export const clockLabel = m => m == null ? "—" :
  `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, "0")}:${String(((m % 60) + 60) % 60).padStart(2, "0")}`;
// Use this only for UI: day-scoped estimates can cross midnight.
export const clockLabelWithDay = minutes => {
  if (!Number.isFinite(minutes)) return "—";
  const day = Math.floor(minutes / 1440);
  return (day > 0 ? (day === 1 ? "다음 날 " : day + "일 후 ") :
    day < 0 ? "전날 " : "") + clockLabel(minutes);
};
export function sourceSignature(places) {
  return JSON.stringify([...places].sort((a, b) => placeKey(a).localeCompare(placeKey(b))).map(p =>
    [placeKey(p), p.day, p.visitOrder, p.isFixed, p.isNextDay, p.arrivalTime, p.stayDuration, p.isStartPoint, p.latitude, p.longitude, p.placeName]));
}
export function defaultStay(p) {
  const value = Number(p?.stayDuration);
  return Number.isSafeInteger(value) && value >= 1 && value <= 1440 ? value : 60;
}
export function edgeKey(a, b) { return `${placeKey(a)}>${placeKey(b)}`; }
export function travelTime(a, b, overrides = {}) {
  const custom = overrides[edgeKey(a, b)];
  return Number.isInteger(custom) && custom >= 1 && custom <= 720
    ? custom : estimatedMinutes(a, b);
}
function addedMinutes(path, pos, candidate, byId, overrides) {
  const from = byId[path[pos - 1]], to = byId[path[pos]];
  const direct = travelTime(from, to, overrides), first = travelTime(from, candidate, overrides);
  const second = travelTime(candidate, to, overrides);
  if (direct == null || first == null || second == null) return Infinity;
  return first + second - direct;
}
function segmentMinutes(seg, byId, stays = {}, overrides = {}) {
  const ids = [seg.from, ...seg.items, seg.to];
  let total = 0;
  for (let i = 1; i < ids.length; i++) {
    const value = travelTime(byId[ids[i - 1]], byId[ids[i]], overrides);
    if (value == null) return Infinity;
    total += value;
  }
  // The from-pin stay belongs to this segment except for the initial departure.
  if (seg.index > 0) total += Number(stays[seg.from] ?? defaultStay(byId[seg.from]));
  for (const id of seg.items) total += Number(stays[id] ?? defaultStay(byId[id]));
  return total;
}
export function initializeOptimization(places, { startTime = "09:00", endTime = "" } = {}) {
  const ordered = [...places].sort((a, b) => a.visitOrder - b.visitOrder);
  if (ordered.length < 2) return { error: "하루에 장소가 두 곳 이상 있어야 해요.", segments: [] };
  if (ordered.some(p => !validCoordinates(p))) {
    return { error: "좌표가 없는 장소가 있어 경로를 추정할 수 없어요.", segments: [] };
  }
  const start = ordered.find(p => p.isStartPoint) || ordered[0];
  const end = [...ordered].reverse().find(p => placeKey(p) !== placeKey(start));
  const fixed = ordered.filter(p => p.isFixed && placeKey(p) !== placeKey(start) &&
    placeKey(p) !== placeKey(end)).sort((a, b) =>
      (minutesOf(a.arrivalTime) ?? 99999) - (minutesOf(b.arrivalTime) ?? 99999));
  // A fixed last place remains an endpoint; its fixed time is still respected.
  const pins = [start, ...fixed, end];
  const byId = Object.fromEntries(ordered.map(p => [placeKey(p), p]));
  const segments = pins.slice(0, -1).map((pin, i) => ({
    id: `segment-${i}`, index: i, from: placeKey(pin), to: placeKey(pins[i + 1]), items: [],
  }));
  const free = ordered.filter(p => !pins.some(pin => placeKey(pin) === placeKey(p)));
  const stays = {}, overrides = {};
  // Best insertion across ALL consecutive pinpoint windows, not nearest-anchor assignment.
  for (const place of free) {
    let best = null;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      for (let pos = 0; pos <= seg.items.length; pos++) {
        const path = [seg.from, ...seg.items, seg.to];
        const delta = addedMinutes(path, pos + 1, place, byId, overrides);
        if (!Number.isFinite(delta)) continue;
        const candidate = { ...seg, items: [...seg.items.slice(0, pos), placeKey(place), ...seg.items.slice(pos)] };
        const previousPin = byId[seg.from], nextPin = byId[seg.to];
        const fromClock = i === 0 ? (start.isFixed ? minutesOf(start.arrivalTime) : minutesOf(startTime)) : minutesOf(previousPin.arrivalTime);
        const toClock = nextPin.isFixed ? minutesOf(nextPin.arrivalTime) :
          i === segments.length - 1 ? minutesOf(endTime) : null;
        const window = fromClock != null && toClock != null ? Math.max(0, toClock - fromClock) : null;
        const over = window === null ? 0 : Math.max(0, segmentMinutes(candidate, byId, stays, overrides) - window);
        const score = delta + over * 10;
        if (!best || score < best.score) best = { index: i, items: candidate.items, score };
      }
    }
    if (best) segments[best.index].items = best.items;
  }
  return { segments, error: "" };
}

export function reorderSegmentPlace(segments, source, destinationSegment, beforeId = null) {
  const id = String(source);
  const target = Number(destinationSegment);
  const origin = segments.findIndex(s => s.items.includes(id));
  if (!Number.isInteger(target) || target < 0 || target >= segments.length || origin < 0) return segments;
  if (String(beforeId) === id) return segments;
  // For an in-segment sortable drop, insert at the old index of the hovered item
  // (arrayMove behavior). For a cross-segment drop, insert before that item.
  const index = beforeId == null ? -1 : segments[target].items.indexOf(String(beforeId));
  const result = segments.map(s => ({ ...s, items: [...s.items] }));
  result[origin].items.splice(result[origin].items.indexOf(id), 1);
  const position = index < 0 ? result[target].items.length : index;
  result[target].items.splice(position, 0, id);
  return result;
}
export function quickOrder(places) {
  const sorted = [...places].sort((a, b) => a.visitOrder - b.visitOrder);
  if (sorted.length < 2) return sorted.map(placeKey);
  if (sorted.some(p => !validCoordinates(p))) return null;
  const start = sorted.find(p => p.isStartPoint) || sorted[0];
  const end = [...sorted].reverse().find(p => placeKey(p) !== placeKey(start));
  const free = sorted.filter(p => p !== start && p !== end);
  const result = [placeKey(start)]; let current = start;
  while (free.length) {
    free.sort((a, b) => distanceKm(current, a) - distanceKm(current, b));
    current = free.shift(); result.push(placeKey(current));
  }
  // Improve nearest-neighbour loops without moving the pinned start/end.
  const byId = Object.fromEntries(sorted.map(p => [placeKey(p), p]));
  let route = [...result, placeKey(end)];
  const routeDistance = keys => keys.slice(1).reduce((sum, id, index) =>
    sum + distanceKm(byId[keys[index]], byId[id]), 0);
  // An existing itinerary with identical anchors is itself a valid candidate.
  const original = sorted.map(placeKey);
  if (original[0] === route[0] && original[original.length - 1] === route[route.length - 1] &&
      routeDistance(original) < routeDistance(route)) route = original;
  // Bounded 2-opt, deterministic for equal distances and limited on large trips.
  for (let pass = 0; pass < 6; pass++) {
    let improved = false;
    for (let i = 1; i < route.length - 2; i++) {
      for (let j = i + 1; j < route.length - 1; j++) {
        const a = byId[route[i - 1]], b = byId[route[i]],
          c = byId[route[j]], d = byId[route[j + 1]];
        const saving = distanceKm(a, b) + distanceKm(c, d) -
          distanceKm(a, c) - distanceKm(b, d);
        if (saving > 1e-8) {
          route = [...route.slice(0, i), ...route.slice(i, j + 1).reverse(), ...route.slice(j + 1)];
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return route;
}
// Comparative distance/time estimates; these are not maps, routes or transit results.
export function routeMetrics(places, order, overrides = {}) {
  if (!Array.isArray(order) || order.length < 2) return null;
  const byId = Object.fromEntries(places.map(place => [placeKey(place), place]));
  let distance = 0, travel = 0;
  for (let i = 1; i < order.length; i++) {
    const previous = byId[String(order[i - 1])], current = byId[String(order[i])];
    if (!previous || !current) return null;
    const km = distanceKm(previous, current);
    const minutes = travelTime(previous, current, overrides);
    if (km == null || minutes == null) return null;
    distance += km;
    travel += minutes;
  }
  return { distanceKm: Math.round(distance * 10) / 10, travelMinutes: travel };
}
export function segmentBreakdown({ segment, index, places, stays = {}, travelOverrides = {},
  startTime = "09:00", endTime = "", segmentTimes = {}, plan }) {
  const byId = Object.fromEntries(places.map(p => [placeKey(p), p]));
  const from = byId[segment.from], to = byId[segment.to];
  if (!from || !to) return null;
  const ids = [segment.from, ...segment.items, segment.to];
  const fromAnchor = index === 0
    ? (from.isFixed ? minutesOf(from.arrivalTime) : minutesOf(startTime))
    : (from.isFixed ? minutesOf(from.arrivalTime) : plan?.rows.find(r => r.id === segment.from)?.time);
  const userTarget = minutesOf(segmentTimes[index]?.arrivalTime);
  const reservation = to.isFixed ? minutesOf(to.arrivalTime) : null;
  const target = reservation == null
    ? (userTarget ?? (index === (plan?.segmentsCount || 0) - 1 ? minutesOf(endTime) : null))
    : (userTarget == null ? reservation : Math.min(userTarget, reservation));
  const departureTarget = minutesOf(segmentTimes[index]?.departureTime);
  const stayFrom = Number(stays[segment.from] ?? (index === 0 ? 0 : defaultStay(from)));
  const stopMinutes = segment.items.reduce((total, id) =>
    total + Number(stays[id] ?? defaultStay(byId[id])), 0);
  let travelMinutes = 0;
  for (let i = 1; i < ids.length; i++) {
    const minutes = travelTime(byId[ids[i - 1]], byId[ids[i]], travelOverrides);
    if (minutes == null) return null;
    travelMinutes += minutes;
  }
  const departureWait = fromAnchor == null ? 0 :
    Math.max(0, (departureTarget ?? 0) - fromAnchor - stayFrom);
  const available = target == null || fromAnchor == null ? null : target - fromAnchor;
  const required = stayFrom + stopMinutes + travelMinutes + departureWait;
  const localLate = available == null ? null : Math.max(0, required - available);
  const lastLeg = plan?.rows.find(r => r.type === "travel" && r.toId === segment.to);
  const actualLate = target == null || !lastLeg ? null : Math.max(0, lastLeg.end - target);
  return { stayFrom, stopMinutes, travelMinutes, departureWait, required, available, localLate, actualLate,
    upstreamLate: actualLate == null || localLate == null ? null : Math.max(0, actualLate - localLate),
    target };
}
export function evaluatePlan({ places, segments = [], order, startTime = "09:00", endTime = "",
  stays = {}, travelOverrides = {}, respectFixed = true, segmentTimes = {} }) {
  const byId = Object.fromEntries(places.map(p => [placeKey(p), p]));
  const ids = order || [segments[0]?.from, ...segments.flatMap(s => [...s.items, s.to])].filter(Boolean);
  const rows = [], warnings = [];
  if (!ids.length) return { rows: [], warnings: ["방문 장소를 확인해 주세요."], order: ids };
  const first = byId[ids[0]];
  if (!first) return { rows: [], warnings: ["방문 장소를 찾지 못했어요."], order: ids };
  let now = respectFixed && first.isFixed ? minutesOf(first.arrivalTime) : minutesOf(startTime);
  if (now === null) return { rows: [], warnings: ["출발 시간을 확인해 주세요."], order: ids };
  rows.push({ type: "start", id: ids[0], name: first.placeName, time: now, end: now, minutes: 0 });
  for (let i = 1; i < ids.length; i++) {
    const previous = byId[ids[i - 1]], current = byId[ids[i]];
    if (!previous || !current) break;
    const stay = i === 1 ? Number(stays[placeKey(previous)] ?? 0) :
      Number(stays[placeKey(previous)] ?? defaultStay(previous));
    now += stay;
    const segmentStart = segments.findIndex(s => s.from === placeKey(previous));
    const departure = segmentStart >= 0 ? minutesOf(segmentTimes[segmentStart]?.departureTime) : null;
    if (departure != null && now > departure) {
      warnings.push(previous.placeName + ": 구간 출발 희망 시각보다 " +
        (now - departure) + "분 늦을 것으로 예상돼요.");
    }
    if (departure != null && now < departure) {
      rows.push({type:"wait",name:previous.placeName + " 출발",time:now,end:departure,minutes:departure-now});
      now = departure;
    }
    const move = travelTime(previous, current, travelOverrides);
    if (move == null) {
      warnings.push(`${current.placeName} 이동 시간을 계산할 수 없어요.`);
      break;
    }
    const depart = now;
    now += move;
    rows.push({ type: "travel", from: previous.placeName, to: current.placeName,
      fromId: placeKey(previous), toId: placeKey(current), time: depart, end: now, minutes: move });
    const endSegment = segments.findIndex(s => s.to === placeKey(current));
    const desiredArrival = endSegment >= 0 ? minutesOf(segmentTimes[endSegment]?.arrivalTime) : null;
    if (desiredArrival != null && now > desiredArrival) {
      warnings.push(current.placeName + ": 구간 도착 희망 시각보다 " +
        (now - desiredArrival) + "분 늦을 것으로 예상돼요.");
    }
    const fixedAt = respectFixed && current.isFixed ? minutesOf(current.arrivalTime) : null;
    if (fixedAt != null && now > fixedAt) {
      warnings.push(`${current.placeName}: 예약보다 ${now - fixedAt}분 늦을 것으로 예상돼요.`);
    }
    if (fixedAt != null && now < fixedAt) {
      rows.push({ type: "wait", name: current.placeName, time: now, end: fixedAt, minutes: fixedAt - now });
      now = fixedAt;
    }
    const isLast = i === ids.length - 1;
    const dwell = Number(stays[placeKey(current)] ?? (isLast ? 0 : defaultStay(current)));
    rows.push({ type: fixedAt != null ? "fixed" : isLast ? "end" : "place",
      id: placeKey(current), name: current.placeName, time: now,
      end: now + dwell, minutes: dwell });
  }
  const arrival = now;
  const deadline = minutesOf(endTime);
  if (deadline != null && arrival > deadline) warnings.push(`도착 희망 시간보다 ${arrival - deadline}분 늦을 것으로 예상돼요.`);
  if (arrival >= 1440) warnings.push("예상 일정이 자정을 넘어 다음 날까지 이어져요. 일차별 구성을 다시 확인해 주세요.");
  return { rows, warnings, order: ids, arrival, segmentsCount: segments.length };
}
