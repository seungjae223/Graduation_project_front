import fs from "fs";
import path from "path";
const region=fs.readFileSync(path.join(__dirname,"TripRegionSelect.css"),"utf8");
const recommend=fs.readFileSync(path.join(__dirname,"../Recommend/Recommend.css"),"utf8");
test("region next action slides above fixed bottom navigation",()=>{
  expect(region).toContain(".v16-region-next.is-visible");
  expect(region).toContain("bottom:calc(var(--footer-height) + env(safe-area-inset-bottom,0px) + 13px)");
  expect(region).not.toContain("선택 완료");
});
test("recommend cards span full photo with a readable bottom gradient",()=>{
  expect(recommend).toContain("grid-template-columns:minmax(0,1fr)");
  expect(recommend).toContain("recommend-destination-link::after");
  expect(recommend).toContain("linear-gradient");
});

test("calendar action has a permanent viewport anchor and a readable date range",()=>{
  const css=fs.readFileSync(path.join(__dirname,"TripDatePage.css"),"utf8");
  expect(css).toContain(".v16-date-actions{position:fixed");
  expect(css).toContain(".v16-date-period-pair strong");
  expect(css).toContain(".v16-date-picker-grid");
});
test("recommendation shows bold city top-left and tagline bottom-left",()=>{
  expect(recommend).toContain(".recommend-destination-info strong{position:absolute;top:18px;left:20px");
  expect(recommend).toContain(".recommend-destination-info small{position:absolute;bottom:21px;left:20px");
});
