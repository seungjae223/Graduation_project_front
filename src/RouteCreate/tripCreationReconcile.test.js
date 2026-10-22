import { findConfirmedCreatedTrip } from "./tripCreationReconcile";
const requested={title:"홍콩 여행",destination:"홍콩",startDate:"2026-10-20",endDate:"2026-10-22"};
const matching=(id)=>({id,...requested});
test("reconciliation accepts exactly one new matching trip",()=>{
  expect(findConfirmedCreatedTrip([matching(1)],[matching(1),matching(2)],requested)).toEqual(matching(2));
  expect(findConfirmedCreatedTrip([],[matching(10)],requested)).toEqual(matching(10));
});
test("reconciliation rejects old matching IDs and ambiguous results",()=>{
  expect(findConfirmedCreatedTrip([matching(1)],[matching(1)],requested)).toBeNull();
  expect(findConfirmedCreatedTrip([],[matching(1),matching(2)],requested)).toBeNull();
  expect(findConfirmedCreatedTrip([], [{...matching(1),startDate:"2026-10-21"}],requested)).toBeNull();
  expect(findConfirmedCreatedTrip([], [{...matching(1),id:"not a number"}],requested)).toBeNull();
});
