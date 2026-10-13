import { returnFromDetail } from "./detailBack";
test("detail entered from a list returns through history", () => {
  const navigate = jest.fn(); returnFromDetail(navigate, 1); expect(navigate).toHaveBeenCalledWith(-1);
});
test.each([0, null, undefined])("a direct detail entry has a fallback destination (%s)", index => {
  const navigate = jest.fn(); returnFromDetail(navigate, index); expect(navigate).toHaveBeenCalledWith("/recommend", { replace: true });
});
