import { uniqueTripTitle } from "./tripTitleDedup";
test("duplicate trip titles get the first available numeric suffix",()=>{
  const trips=[{id:1,title:"홍콩"},{id:2,title:"홍콩 (1)"},{id:3,title:"홍콩 (3)"}];
  expect(uniqueTripTitle(" 홍콩 ",trips,99)).toBe("홍콩 (2)");
});
test("current trip is excluded from duplicate title collisions",()=>{
  expect(uniqueTripTitle("홍콩",[{id:7,title:"홍콩"}],7)).toBe("홍콩");
});
test("generated title respects backend 100-character limit",()=>{
  const name="가".repeat(100);
  const result=uniqueTripTitle(name,[{id:1,title:name}],2);
  expect(result).toHaveLength(100);
  expect(result.endsWith(" (1)")).toBe(true);
});
