import {
  PLACE_CATEGORIES, destinationForTrip, belongsToDestination, classifySources,
  filterPlaceList, togglePlaceSelection, pickerReturnPath,
} from "./tripPlacePickerModel";

const destination = { name: "홍콩", code: "hong-kong" };
const hk = (id, category = "LANDMARK") => ({ id, name: "홍콩장소" + id, region: "홍콩", placeCategory: category });
const jp = (id, category = "FOOD") => ({ id, name: "일본장소" + id, region: "일본", placeCategory: category });

test("uses exactly the seven existing categories plus All", () => {
  expect(PLACE_CATEGORIES.map(x => x.key)).toEqual([
    "ALL","LANDMARK","CULTURE","NATURE","FOOD","SHOPPING","EXPERIENCE","STAY",
  ]);
});
test("matches the exact destination name or its code rather than mixing countries", () => {
  expect(destinationForTrip([destination], "홍콩")).toEqual(destination);
  expect(belongsToDestination(hk(1), destination, new Set())).toBe(true);
  expect(belongsToDestination(jp(2), destination, new Set())).toBe(false);
  expect(belongsToDestination({ ...jp(3), region: "" }, destination, new Set([3]))).toBe(true);
  expect(belongsToDestination({ ...jp(4), region: "" }, destination, new Set())).toBe(false);
});
test("hotel and favorites precede all normal folders, sorted by matching region count", () => {
  const folders = [
    { id: 10, name:"일본 여행", systemType:null },
    { id: 20, name:"좋아하는 장소", systemType:"FAVORITES" },
    { id: 30, name:"홍콩 여행", systemType:null },
    { id: 40, name:"카페 모음", systemType:null },
    { id: 50, name:"숙소", systemType:null },
  ];
  const rows = {
    10:[jp(11),jp(12)],
    20:[jp(12),hk(13)],
    30:[hk(13),hk(14),hk(15),jp(16)],
    40:[hk(17)],
    50:[hk(18,"STAY"),jp(19,"STAY")],
  };
  const result = classifySources(folders, rows, destination, new Set());
  expect(result.map(x => x.name)).toEqual([
    "내 숙소","좋아하는 장소","홍콩 여행","카페 모음","숙소","일본 여행",
  ]);
  expect(result[0].places.map(x => x.id)).toEqual([18]);
  expect(result[1].places.map(x => x.id)).toEqual([13]);
  expect(result.map(x => Boolean(x.highlight))).toEqual([false,false,true,true,true,false]);
  expect(result[2].count).toBe(3);
  expect(result[5].places).toEqual([]);
});
test("an itinerary STAY is included in My Hotels without a saved-folder membership", () => {
  const r = classifySources([{id:20,systemType:"FAVORITES",name:"좋아하는 장소"}],
    {20:[]}, destination, new Set(), [hk(45,"STAY"), jp(46,"STAY")]);
  expect(r[0].id).toBe("hotel");
  expect(r[0].places.map(x => x.id)).toEqual([45]);
});
test("filters same-region results by existing category and name", () => {
  const places = [hk(1,"STAY"),hk(2,"FOOD"),jp(3)];
  expect(filterPlaceList(places,"STAY").map(x => x.id)).toEqual([1]);
  expect(filterPlaceList(places,"ALL","홍콩장소2").map(x => x.id)).toEqual([2]);
});
test("shared selection is independent of the current target day", () => {
  let selection = [];
  selection = togglePlaceSelection(selection, 5);
  selection = togglePlaceSelection(selection, 7);
  selection = togglePlaceSelection(selection, 6);
  expect(selection).toEqual([5,7,6]);
  expect(togglePlaceSelection(selection, 5)).toEqual([7,6]);
  expect(selection).toEqual([5,7,6]);
  expect(pickerReturnPath(12,2)).toBe("/route-result?id=12&edit=1&day=2");
});
