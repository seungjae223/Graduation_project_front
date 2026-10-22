import { addOptimizedPlace, editOptimizedVisit, moveOptimizedVisit, optimizedStay, optimizedTime, removeOptimizedPlaces, reorderOptimizedVisit } from "./optimizedVisitDraft";
import { readOptimizedVersions, saveOptimizedDay } from "./tripOptimizationVersionStore";

const places=[
  {tripPlaceId:1,day:1,visitOrder:1,placeName:"출발",stayDuration:60,arrivalTime:"09:00"},
  {tripPlaceId:2,day:1,visitOrder:2,placeName:"M+",stayDuration:60,arrivalTime:"10:00"},
  {tripPlaceId:3,day:1,visitOrder:3,placeName:"만모사원",stayDuration:60,arrivalTime:"12:00"},
  {tripPlaceId:4,day:1,visitOrder:4,placeName:"숙소 도착",stayDuration:60},
];
const optimized={mode:"careful",order:["1","3","2","4"],warnings:[],
  rows:[
    {type:"start",id:"1",name:"출발",time:570,end:570,minutes:0},
    {type:"fixed",id:"3",name:"만모사원",time:720,end:780,minutes:60},
    {type:"place",id:"2",name:"M+",time:830,end:950,minutes:120},
    {type:"end",id:"4",name:"숙소 도착",time:985,end:985,minutes:0}
  ],
  stayOverrides:{"2":120},
};
afterEach(()=>window.localStorage.clear());
test("optimized visit editor reads the optimizer's timetable and dwell instead of original",()=>{
  expect(optimizedTime(optimized,places[1])).toBe("13:50");
  expect(optimizedTime(optimized,places[2])).toBe("12:00");
  expect(optimizedStay(optimized,places[1])).toBe(120);
  expect(optimizedStay(optimized,places[2])).toBe(60);
  expect(places[1].arrivalTime).toBe("10:00");
  expect(places[1].stayDuration).toBe(60);
});
test("optimized-only visit edit persists time, dwell and memo without mutating original",()=>{
  expect(saveOptimizedDay(12,"account:test",places,1,optimized)).toBe(true);
  const original=readOptimizedVersions(12,"account:test",places)["1"];
  const changed=editOptimizedVisit(original,places[1],{time:"14:30",stay:90,memo:"별도 메모"});
  expect(changed).toBeTruthy();
  expect(saveOptimizedDay(12,"account:test",places,1,changed)).toBe(true);
  const saved=readOptimizedVersions(12,"account:test",places)["1"];
  expect(saved.stale).toBe(false);
  expect(saved.mode).toBe("careful");
  expect(saved.manuallyEdited).toBe(true);
  expect(saved.memoOverrides["2"]).toBe("별도 메모");
  expect(optimizedTime(saved,places[1])).toBe("14:30");
  expect(optimizedStay(saved,places[1])).toBe(90);
  expect(places[1].arrivalTime).toBe("10:00");
  expect(places[1].stayDuration).toBe(60);
});
test("optimized-only reordering keeps original start/end pinned",()=>{
  expect(moveOptimizedVisit(optimized,"1",1)).toBeNull();
  expect(moveOptimizedVisit(optimized,"4",-1)).toBeNull();
  const result=moveOptimizedVisit(optimized,"3",1);
  expect(result.order).toEqual(["1","2","3","4"]);
  expect(optimized.order).toEqual(["1","3","2","4"]);
  expect(result.manuallyEdited).toBe(true);
});
test("manual source changes still invalidate an edited optimized copy",()=>{
  expect(saveOptimizedDay(12,"account:test",places,1,optimized)).toBe(true);
  const saved=readOptimizedVersions(12,"account:test",places)["1"];
  const revised=editOptimizedVisit(saved,places[1],{time:"13:30",stay:120,memo:""});
  expect(saveOptimizedDay(12,"account:test",places,1,revised)).toBe(true);
  const sourceChanged=places.map(p=>p.tripPlaceId===2?{...p,stayDuration:45}:p);
  expect(readOptimizedVersions(12,"account:test",sourceChanged)["1"].stale).toBe(true);
});
test("unusable optimized inputs are not stored",()=>{
  expect(editOptimizedVisit(optimized,places[1],{time:"26:99",stay:60,memo:""})).toBeNull();
  expect(editOptimizedVisit(optimized,places[1],{time:"12:00",stay:-1,memo:""})).toBeNull();
  expect(editOptimizedVisit(optimized,places[1],{time:"12:00",stay:1441,memo:""})).toBeNull();
});

test("optimized-only added place remains in local draft after reopen while original is unchanged",()=>{
  expect(saveOptimizedDay(12,"account:test",places,1,optimized)).toBe(true);
  const original=readOptimizedVersions(12,"account:test",places)["1"];
  const next=addOptimizedPlace(original,{id:88,name:"홍콩 공원",region:"홍콩",latitude:22.3,longitude:114.1});
  const addedId=next.order[next.order.length-2];
  expect(addedId).toMatch(/^opt:88:\d+$/);
  expect(next.order.at(-1)).toBe("4");
  expect(saveOptimizedDay(12,"account:test",places,1,next)).toBe(true);
  const reopened=readOptimizedVersions(12,"account:test",places)["1"];
  expect(reopened.stale).toBe(false);
  expect(reopened.addedPlaces[addedId].placeName).toBe("홍콩 공원");
  expect(reopened.order).toContain(addedId);
  expect(places).toHaveLength(4);
});
test("optimized-only delete removes a middle visit and cannot delete original anchors",()=>{
  const removed=removeOptimizedPlaces(optimized,["3"]);
  expect(removed.order).toEqual(["1","2","4"]);
  expect(removed.rows.some(row=>row.id==="3")).toBe(false);
  expect(saveOptimizedDay(12,"account:test",places,1,removed)).toBe(true);
  expect(readOptimizedVersions(12,"account:test",places)["1"].order).toEqual(["1","2","4"]);
  expect(removeOptimizedPlaces(optimized,["1"])).toBeNull();
  expect(removeOptimizedPlaces(optimized,["4"])).toBeNull();
  expect(places[2].placeName).toBe("만모사원");
});
test("drag reorder refuses pinned endpoints and updates local order only",()=>{
  const rearranged=reorderOptimizedVisit(optimized,"3","2");
  expect(rearranged.order).toEqual(["1","2","3","4"]);
  expect(reorderOptimizedVisit(optimized,"1","3")).toBeNull();
  expect(reorderOptimizedVisit(optimized,"4","3")).toBeNull();
});

test("opening and closing without changing an optimized visit does not waive the edit warning",()=>{
  const unchanged=editOptimizedVisit(optimized,places[1],{
    time:"13:50",stay:120,memo:""
  });
  expect(unchanged).toBe(optimized);
  expect(unchanged.manuallyEdited).toBeUndefined();
});
