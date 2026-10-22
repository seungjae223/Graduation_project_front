import api from "./api";
import { createTripApi } from "./tripApi";
jest.mock("./api",()=>({__esModule:true,default:{post:jest.fn()}}));
beforeEach(()=>jest.clearAllMocks());
test("V16 persists selected destination and real dates with unknown map coordinates",async()=>{
  api.post.mockResolvedValue({data:{id:207,title:"오사카 여행",destination:"오사카",startDate:"2026-11-12",endDate:"2026-11-15",latitude:null,longitude:null}});
  const created=await createTripApi({title:"오사카 여행",destination:"오사카",
    startDate:"2026-11-12",endDate:"2026-11-15",latitude:null,longitude:null});
  expect(api.post).toHaveBeenCalledWith("/api/trips",expect.objectContaining({
    destination:"오사카",startDate:"2026-11-12",endDate:"2026-11-15",
    latitude:null,longitude:null,
  }));
  expect(created.id).toBe(207);
});
