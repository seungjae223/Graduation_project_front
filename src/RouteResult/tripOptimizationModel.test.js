import { clockLabel, clockLabelWithDay, distanceKm, estimatedMinutes, edgeKey, evaluatePlan,
  initializeOptimization, segmentBreakdown, placeKey, quickOrder, reorderSegmentPlace, routeMetrics, sourceSignature, TRAVEL_ESTIMATE } from "./tripOptimizationModel";
import { readOptimizedVersions, saveOptimizedDay } from "./tripOptimizationVersionStore";

const sample = [
  { tripPlaceId: 1, placeName: "호텔", day: 1, visitOrder: 1, latitude: 34.693, longitude: 135.501, isStartPoint: true, stayDuration: 60 },
  { tripPlaceId: 2, placeName: "오사카성", day: 1, visitOrder: 2, latitude: 34.687, longitude: 135.526, stayDuration: 60 },
  { tripPlaceId: 3, placeName: "점심 예약", day: 1, visitOrder: 3, latitude: 34.670, longitude: 135.500, isFixed: true, arrivalTime: "12:00", stayDuration: 60 },
  { tripPlaceId: 4, placeName: "도톤보리", day: 1, visitOrder: 4, latitude: 34.668, longitude: 135.503, stayDuration: 60 },
  { tripPlaceId: 5, placeName: "공연 예약", day: 1, visitOrder: 5, latitude: 34.701, longitude: 135.496, isFixed: true, arrivalTime: "18:00", stayDuration: 90 },
  { tripPlaceId: 6, placeName: "호텔 도착", day: 1, visitOrder: 6, latitude: 34.693, longitude: 135.501, stayDuration: 60 },
];
test("distance estimator uses real coordinates, not default Seoul coordinates", () => {
  expect(distanceKm(sample[0], sample[1])).toBeGreaterThan(0);
  expect(estimatedMinutes(sample[0], sample[1])).toBeGreaterThan(0);
  expect(estimatedMinutes(sample[0], { ...sample[1], latitude: null })).toBeNull();
  expect(estimatedMinutes(sample[0], sample[0])).toBe(0);
});
test("initial pinpoint segments preserve start, fixed reservations, and final destination", () => {
  const value = initializeOptimization(sample, { startTime: "09:00" });
  expect(value.error).toBe("");
  expect(value.segments.map(s => [s.from, s.to])).toEqual([["1","3"],["3","5"],["5","6"]]);
  const groups = value.segments.flatMap(s => s.items);
  expect(groups.slice().sort()).toEqual(["2","4"]);
});
test("manual drag may order places within a segment and move them into another", () => {
  const all = [{ id: "segment-0", index: 0, from: "1", to: "3", items: ["2", "4"] },
    { id: "segment-1", index: 1, from: "3", to: "5", items: ["7"] }];
  const reordered = reorderSegmentPlace(all, "4", 0, "2");
  expect(reordered[0].items).toEqual(["4", "2"]);
  const moved = reorderSegmentPlace(reordered, "2", 1, "7");
  expect(moved[0].items).toEqual(["4"]);
  expect(moved[1].items).toEqual(["2", "7"]);
  expect(all[0].items).toEqual(["2", "4"]);
});
test("dragging an item downwards within a segment changes its position", () => {
  const segments = [{ id: "segment-0", index: 0, from: "start", to: "end", items: ["2","3","4"] }];
  expect(reorderSegmentPlace(segments, "2", 0, "4")[0].items).toEqual(["3","4","2"]);
  expect(segments[0].items).toEqual(["2","3","4"]);
});
test("time calculation is read-only and manual travel changes arrivals", () => {
  const initial = initializeOptimization(sample, { startTime: "09:00" }).segments;
  const order = [initial[0].from, ...initial.flatMap(s => [...s.items, s.to])];
  const originalJSON = JSON.stringify(sample);
  const first = evaluatePlan({ places: sample, segments: initial, order, startTime: "09:00" });
  expect(first.order).toEqual(order);
  expect(first.rows.some(r => r.type === "fixed" && r.name === "점심 예약")).toBe(true);
  expect(first.rows.some(r => r.type === "travel")).toBe(true);
  const key = edgeKey(sample[0], sample.find(p => String(p.tripPlaceId) === order[1]));
  const second = evaluatePlan({ places: sample, segments: initial, order,
    startTime: "09:00", travelOverrides: { [key]: 120 } });
  expect(second.rows.find(r => r.type === "travel").minutes).toBe(120);
  expect(second.rows.find(r => r.type === "travel").time).toBe(first.rows.find(r => r.type === "travel").time);
  expect(sample).toEqual(JSON.parse(originalJSON));
});
test("quick mode pins first and last, and source signature notices changes", () => {
  const order = quickOrder(sample);
  expect(order[0]).toBe("1");
  expect(order[order.length - 1]).toBe("6");
  expect(new Set(order).size).toBe(6);
  expect(sourceSignature(sample)).not.toBe(sourceSignature(sample.map(p =>
    p.tripPlaceId === 2 ? { ...p, stayDuration: 90 } : p)));
  expect(clockLabel(9 * 60 + 5)).toBe("09:05");
});
test("a fixed first stop is treated as a departure-time anchor", () => {
  const fixedStart = sample.map((place,i) => i === 0 ?
    {...place,isFixed:true,arrivalTime:"10:30"} : place);
  const { segments } = initializeOptimization(fixedStart,{startTime:"09:00"});
  const order = fixedStart.map(p => String(p.tripPlaceId));
  const plan = evaluatePlan({places:fixedStart,segments,order,startTime:"09:00"});
  expect(plan.rows[0].time).toBe(630);
});
test("browser-local version does not mutate originals and detects stale source", () => {
  window.localStorage.clear();
  const order = sample.map(p => String(p.tripPlaceId));
  const draft = { order, rows: [{ type: "start", id: "1", name: "호텔", time: 540 },
    { type: "place", id: "2", name: "오사카성", time: 570 }], warnings: [] };
  expect(saveOptimizedDay(12, "account:example:session:1", sample, 1, draft)).toBe(true);
  const saved = readOptimizedVersions(12, "account:example:session:1", sample);
  expect(saved["1"].order).toEqual(order);
  expect(saved["1"].stale).toBe(false);
  expect(readOptimizedVersions(12, "account:someone-else:session:1", sample)).toEqual({});
  const changed = sample.map(p => p.tripPlaceId === 2 ? { ...p, stayDuration: 80 } : p);
  expect(readOptimizedVersions(12, "account:example:session:1", changed)["1"].stale).toBe(true);
  expect(sample[1].stayDuration).toBe(60);
  window.localStorage.clear();
});
test("corrupt optimized version cannot be accepted as an unrelated travel day", () => {
  window.localStorage.clear();
  expect(saveOptimizedDay(12, "account:example:session:1", sample, 1, {
    order: ["1","2","3","3","5","6"], rows: [], warnings: [],
  })).toBe(false);
  expect(readOptimizedVersions(12, "anonymous", sample)).toEqual({});
});

test("quick preview does not wait for or enforce reservation anchors",()=>{
  const order=quickOrder(sample);
  const quick=evaluatePlan({places:sample,segments:[],order,startTime:"09:00",respectFixed:false});
  expect(quick.rows.find(r=>r.type==="start").time).toBe(540);
  expect(quick.rows.some(r=>r.type==="wait"||r.type==="fixed")).toBe(false);
  expect(quick.warnings.some(w=>w.includes("예약"))).toBe(false);
  const careful=evaluatePlan({places:sample,segments:[],order,startTime:"09:00",respectFixed:true});
  expect(careful.rows.some(r=>r.type==="fixed")).toBe(true);
});
test("metrics compare each full route with physical coordinates, not just place count",()=>{
  const original=sample.map(placeKey);
  const changed=["1","3","2","5","4","6"];
  const before=routeMetrics(sample,original),after=routeMetrics(sample,changed);
  expect(before.distanceKm).toBeGreaterThan(0);
  expect(after.distanceKm).toBeGreaterThan(0);
  expect(Number.isFinite(before.travelMinutes)).toBe(true);
  expect(routeMetrics(sample,["1","missing"])).toBeNull();
  expect(routeMetrics(sample,["1","2"],{"1>2":35}).travelMinutes).toBe(35);
});
test("coordinate revisions invalidate locally stored optimized snapshots",()=>{
  window.localStorage.clear();
  const order=sample.map(placeKey);
  expect(saveOptimizedDay(12,"account:example",sample,1,{order,rows:[],warnings:[]})).toBe(true);
  const revised=sample.map(p=>p.tripPlaceId===2?{...p,latitude:p.latitude+.01}:p);
  expect(readOptimizedVersions(12,"account:example",revised)["1"].stale).toBe(true);
  window.localStorage.clear();
});

test("quick order never worsens direct-line total distance when original anchors match",()=>{
  const original=sample.map(placeKey);
  const optimized=quickOrder(sample);
  const originalMetric=routeMetrics(sample,original);
  const optimizedMetric=routeMetrics(sample,optimized);
  expect(optimized[0]).toBe("1");
  expect(optimized[optimized.length-1]).toBe("6");
  expect(optimizedMetric.distanceKm).toBeLessThanOrEqual(originalMetric.distanceKm);
  expect(new Set(optimized).size).toBe(sample.length);
});

test("overnight estimates are labeled and warned instead of appearing to end before departure",()=>{
  const order=sample.map(placeKey);
  const plan=evaluatePlan({places:sample,order,segments:[],startTime:"23:00",respectFixed:false});
  expect(plan.arrival).toBeGreaterThanOrEqual(1440);
  expect(clockLabelWithDay(plan.arrival)).toMatch(/다음 날/);
  expect(plan.warnings.some(w=>w.includes("자정을 넘어"))).toBe(true);
});

test("segment breakdown isolates pin-to-pin work from earlier cumulative lateness",()=>{
  const trip=[
    {tripPlaceId:1,placeName:"이전 장소",visitOrder:1,latitude:22.3,longitude:114.16,isStartPoint:true},
    {tripPlaceId:2,placeName:"M+",visitOrder:2,latitude:22.302,longitude:114.158,isFixed:true,arrivalTime:"11:00"},
    {tripPlaceId:3,placeName:"만모사원",visitOrder:3,latitude:22.285,longitude:114.15,isFixed:true,arrivalTime:"12:30"},
    {tripPlaceId:4,placeName:"숙소",visitOrder:4,latitude:22.29,longitude:114.16},
  ];
  const segments=initializeOptimization(trip,{startTime:"09:00"}).segments;
  const order=[segments[0].from,...segments.flatMap(s=>[...s.items,s.to])];
  const plan=evaluatePlan({places:trip,order,segments,startTime:"09:00",stays:{"2":60}});
  const idx=segments.findIndex(s=>s.from==="2");
  const part=segmentBreakdown({segment:segments[idx],index:idx,places:trip,stays:{"2":60},startTime:"09:00",plan});
  expect(part.available).toBe(90);
  expect(part.stayFrom).toBe(60);
  expect(part.travelMinutes).toBeGreaterThan(0);
  expect(part.localLate).toBe(Math.max(0,part.required-90));
});
test("manual segment time targets warn but do not override fixed reservation",()=>{
  const segments=initializeOptimization(sample,{startTime:"09:00"}).segments;
  const order=[segments[0].from,...segments.flatMap(s=>[...s.items,s.to])];
  const plan=evaluatePlan({places:sample,segments,order,
    segmentTimes:{0:{departureTime:"14:00",arrivalTime:"10:00"}}});
  expect(plan.warnings.some(w=>w.includes("구간 도착 희망"))).toBe(true);
  expect(plan.rows.some(r=>r.name==="점심 예약"&&r.type==="fixed")).toBe(true);
});

test("a manually chosen later segment target never moves the fixed booking time",()=>{
  const segments=initializeOptimization(sample,{startTime:"09:00"}).segments;
  const order=[segments[0].from,...segments.flatMap(s=>[...s.items,s.to])];
  const custom={0:{arrivalTime:"20:00"}};
  const plan=evaluatePlan({places:sample,segments,order,startTime:"09:00",segmentTimes:custom});
  const info=segmentBreakdown({segment:segments[0],index:0,places:sample,
    startTime:"09:00",segmentTimes:custom,plan});
  expect(info.target).toBe(720);
});
test("last destination permits dwell adjustment without redefining its arrival time",()=>{
  const order=sample.map(placeKey);
  const base=evaluatePlan({places:sample,segments:[],order,stays:{"6":0}});
  const withStay=evaluatePlan({places:sample,segments:[],order,stays:{"6":90}});
  expect(withStay.arrival).toBe(base.arrival);
  expect(withStay.rows.find(r=>r.id==="6").minutes).toBe(90);
  expect(withStay.rows.find(r=>r.id==="6").end).toBe(base.arrival+90);
});

test("a delay inherited from an earlier appointment does not inflate this segment's own estimate",()=>{
  const tour=[
    {tripPlaceId:1,placeName:"출발점",visitOrder:1,latitude:22.30,longitude:114.17,isStartPoint:true},
    {tripPlaceId:2,placeName:"M+",visitOrder:2,latitude:22.301,longitude:114.169,isFixed:true,arrivalTime:"11:00"},
    {tripPlaceId:3,placeName:"만모사원",visitOrder:3,latitude:22.285,longitude:114.15,isFixed:true,arrivalTime:"12:30"},
    {tripPlaceId:4,placeName:"마지막 장소",visitOrder:4,latitude:22.29,longitude:114.17},
  ];
  const segments=initializeOptimization(tour,{startTime:"12:00"}).segments;
  const order=[segments[0].from,...segments.flatMap(s=>[...s.items,s.to])];
  const plan=evaluatePlan({places:tour,segments,order,startTime:"12:00"});
  const segmentIndex=segments.findIndex(s=>s.from==="2");
  const info=segmentBreakdown({segment:segments[segmentIndex],index:segmentIndex,places:tour,
    startTime:"12:00",plan});
  expect(info.available).toBe(90);
  expect(info.actualLate).toBeGreaterThanOrEqual(info.localLate);
  expect(info.upstreamLate).toBeGreaterThan(0);
});

test("distance-only calibration uses the walking threshold without asking for a transport mode",()=>{
  const atDistance = km => [
    {tripPlaceId:91, latitude:0,longitude:0},
    {tripPlaceId:92, latitude:km/111.195,longitude:0},
  ];
  const estimate = km => estimatedMinutes(...atDistance(km));
  expect(TRAVEL_ESTIMATE.walkMaxStraightKm).toBe(1.2);
  expect(estimate(0)).toBe(0);
  expect(estimate(.2)).toBe(5);
  expect(estimate(.26)).toBe(7);
  expect(estimate(.41)).toBe(10);
  expect(estimate(1.19)).toBe(25);
  expect(estimate(1.21)).toBe(11);
  expect(estimate(10.91)).toBe(41);
  expect(estimate(26.71)).toBe(89);
  expect(estimate(40)).toBeGreaterThan(estimate(26.71));
  expect(estimatedMinutes(...atDistance(2))).toBeGreaterThan(0);
});
test("manual time overrides remain authoritative after fallback calibration",()=>{
  const a={tripPlaceId:11,latitude:0,longitude:0};
  const b={tripPlaceId:12,latitude:0.05,longitude:0};
  const without=routeMetrics([a,b],["11","12"]);
  const withOverride=routeMetrics([a,b],["11","12"],{"11>12":29});
  expect(without.travelMinutes).not.toBe(29);
  expect(withOverride.travelMinutes).toBe(29);
});

test("changing saved visit dwell invalidates the associated optimization snapshot",()=>{
  window.localStorage.clear();
  const order=sample.map(placeKey);
  expect(saveOptimizedDay(12,"account:example",sample,1,{
    mode:"careful",order,rows:[],warnings:[],
  })).toBe(true);
  const original=readOptimizedVersions(12,"account:example",sample)["1"];
  expect(original.stale).toBe(false);
  expect(original.mode).toBe("careful");
  const changed=sample.map(place=>place.tripPlaceId===2
    ? {...place,stayDuration:90} : place);
  expect(readOptimizedVersions(12,"account:example",changed)["1"].stale).toBe(true);
  window.localStorage.clear();
});
