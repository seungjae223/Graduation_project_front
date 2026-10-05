import { editDayOrder, sameOrder, visitKey } from "./temporaryOrder";
const one = { tripPlaceId: 91, placeId: 4, time: "11:20", stayDuration: 30, memo: "저장된 메모" };
const two = { tripPlaceId: 92, placeId: 4, time: "12:00", fixedTime: "12:00", arrivalDayOffset: 1, stayDuration: 60 };
test("duplicate placeId visits keep their own fixed times and settings without 09:00", () => {
  const day = { items: [one, two] }, edited = editDayOrder(day, [two, one]);
  expect(edited.items.map(visitKey)).toEqual(["92", "91"]); expect(edited.isCustomOrder).toBe(true);
  expect(edited.items[0]).toMatchObject({ fixedTime: "12:00", arrivalDayOffset: 1, stayDuration: 60 });
  expect(edited.items[1]).toMatchObject({ time: "재계산 필요", stayDuration: 30, memo: "저장된 메모" });
  expect(day.items).toEqual([one, two]); expect(edited.items.every(item => item.time !== "09:00")).toBe(true);
});
test("original order requires no edit; restoring uses latest memo and original times", () => {
  const day = { items: [{ ...one, memo: "새로 저장한 메모" }, two] };
  expect(sameOrder(day.items, [one, two])).toBe(true);
  expect(editDayOrder(day, [one, two])).toBe(day);
  expect(day.items[0].memo).toBe("새로 저장한 메모"); expect(day.items[0].time).toBe("11:20");
});
