import { validateTripRequest } from "../utils/tripValidation";
test("V16 initial trip keeps unknown coordinates null instead of inventing Seoul",()=>{
  const request={title:"오사카 여행",destination:"오사카",startDate:"2026-11-12",endDate:"2026-11-15",latitude:null,longitude:null};
  expect(validateTripRequest(request)).toBe(request);
  expect(()=>validateTripRequest({...request,longitude:127})).toThrow(/좌표/);
});
