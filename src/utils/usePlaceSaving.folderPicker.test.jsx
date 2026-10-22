import { act, renderHook } from "@testing-library/react";
import usePlaceSaving from "./usePlaceSaving";
import { savePlaceToFolderApi, removePlaceFromFolderApi } from "../api/placeApi";

const mockNavigate = jest.fn();
const mockTask = { blocked: false, status: "idle", reset: jest.fn(), run: jest.fn() };
let mockAccount = "account:A";
const mockFolders = { account: "account:A", status: "success", data: {
  folders: [{ id: "custom", name: "여행" }], placeFolders: { "1": ["custom"] },
}, read: jest.fn() };

jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("../api/placeApi", () => ({ savePlaceToFolderApi: jest.fn(), removePlaceFromFolderApi: jest.fn() }));
jest.mock("../Context/SavedPlacesContext", () => ({ useSavedPlaces: () => ({ isSaved: () => true }) }));
jest.mock("./authState", () => ({ getAuthSnapshot: () => ({ accountKey: mockAccount }) }));
jest.mock("./authRedirect", () => ({ buildLoginPath: () => "/login" }));
jest.mock("./useFolderSavedPlaces", () => ({ __esModule: true,
  default: () => mockFolders, savedPlaceId: place => String(place?.id || ""),
}));
jest.mock("./useMutationTask", () => ({ __esModule: true, default: () => mockTask }));

beforeEach(() => {
  jest.clearAllMocks();
  mockAccount = "account:A";
  mockFolders.account = "account:A";
  mockFolders.status = "success";
  mockTask.blocked = false;
  mockTask.status = "idle";
  mockTask.run.mockImplementation(async write => { await write(); });
});

test("이미 다른 폴더에 저장됐어도 추가 선택 화면을 열고 DELETE 대신 POST를 실행", async () => {
  const { result } = renderHook(() => usePlaceSaving());
  const event = { stopPropagation: jest.fn() };
  const place = { id: 1, name: "센소지" };
  act(() => result.current.openFolderPicker(event, place));
  expect(event.stopPropagation).toHaveBeenCalled();
  expect(result.current.open).toBe(true);
  expect(result.current.removing).toBe(false);
  expect(result.current.target).toEqual(place);
  await act(async () => result.current.save({ id: "custom", name: "여행" }));
  expect(savePlaceToFolderApi).toHaveBeenCalledWith({ folderId: "custom", placeId: "1" });
  expect(removePlaceFromFolderApi).not.toHaveBeenCalled();
});

test("비로그인 상태에서는 폴더 추가 요청을 보내지 않고 로그인으로 이동", () => {
  mockAccount = "anonymous";
  mockFolders.account = "anonymous";
  const { result } = renderHook(() => usePlaceSaving());
  act(() => result.current.openFolderPicker({ stopPropagation: jest.fn() }, { id: 1 }));
  expect(mockNavigate).toHaveBeenCalledWith("/login");
  expect(result.current.open).toBe(false);
  expect(savePlaceToFolderApi).not.toHaveBeenCalled();
});
