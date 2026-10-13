import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import Detail from "./Detail";
import api from "../api/api";
import { SavedPlacesProvider, useSavedPlaces } from "../Context/SavedPlacesContext";
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => "account:test" }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: "account:test" }) }));
jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn().mockResolvedValue({}), delete: jest.fn() }, getAccessToken: () => "test-session", getApiErrorMessage: (_, fallback) => fallback }));
jest.mock("../utils/recentPlaces", () => ({ saveRecentPlace: jest.fn() }));
const place = id => ({ id, name: "장소 " + id, address: "주소 " + id });
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
beforeAll(() => { HTMLElement.prototype.scrollIntoView = jest.fn(); });
afterAll(() => { HTMLElement.prototype.scrollIntoView = originalScrollIntoView; });
beforeEach(() => { jest.clearAllMocks(); api.post.mockResolvedValue({}); api.delete.mockResolvedValue({}); api.get.mockImplementation(async url => ({ data: url === "/api/folders" || url.endsWith("/reviews") ? [] : place(Number(url.split("/").pop())) })); });
function Nav() { const navigate = useNavigate(); return <><button onClick={() => navigate("/detail?id=2")}>B로 이동</button><Detail /></>; }
function SavedState() { const {isSaved}=useSavedPlaces(); return <p data-testid="shared-saved-state">{isSaved(1) ? "저장됨" : "미저장"}</p>; }
const setup = () => render(<MemoryRouter initialEntries={["/detail?id=1"]}><SavedPlacesProvider><Nav /><SavedState /></SavedPlacesProvider></MemoryRouter>);
test("full review response is revealed locally in batches without another GET", async () => {
  api.get.mockImplementation(async url => ({ data: url.endsWith("/reviews") ? Array.from({ length: 7 }, (_, index) => ({ id: index + 1, rating: 4, comment: "리뷰 " + index })) : url === "/api/folders" ? [] : place(1) }));
  setup(); await screen.findByText("리뷰 2"); expect(screen.queryByText("리뷰 3")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "리뷰 더보기" })); await screen.findByText("리뷰 5");
  fireEvent.click(screen.getByRole("button", { name: "리뷰 더보기" })); await screen.findByText("리뷰 6");
  expect(screen.queryByRole("button", { name: "리뷰 더보기" })).not.toBeInTheDocument(); expect(api.get.mock.calls.filter(([url]) => url.endsWith("/reviews"))).toHaveLength(1);
});
test("review failure and saved-state failure do not erase detail or mean empty/not saved", async () => {
  api.get.mockImplementation(async url => { if (url.endsWith("/reviews") || url === "/api/folders") throw new Error("fail"); return { data: place(1) }; });
  setup(); expect(await screen.findByRole("heading", { name: "장소 1" })).toBeInTheDocument();
  expect(await screen.findByText("리뷰를 불러오지 못했어요. 다시 시도해 주세요.")).toBeInTheDocument();
  expect(screen.queryByText("아직 리뷰가 없어요.")).not.toBeInTheDocument();
  const toggle = screen.getByRole("button", { name: /관심 장소에 추가하기/ }); expect(toggle).toBeDisabled();
  fireEvent.click(toggle); expect(api.delete).not.toHaveBeenCalled();
  const callsBefore = api.get.mock.calls.filter(([url]) => url === "/api/places/1").length;
  api.get.mockResolvedValue({ data: [] }); fireEvent.click(screen.getByRole("button", { name: "리뷰 다시 불러오기" }));
  expect(await screen.findByText("아직 리뷰가 없어요.")).toBeInTheDocument();
  expect(api.get.mock.calls.filter(([url]) => url === "/api/places/1")).toHaveLength(callsBefore);
});
test("late A detail never overwrites B", async () => {
  let resolveA; const pending = new Promise(resolve => { resolveA = resolve; });
  api.get.mockImplementation(async url => url === "/api/places/1" ? pending : { data: url === "/api/folders" || url.endsWith("/reviews") ? [] : place(2) });
  setup(); fireEvent.click(screen.getByRole("button", { name: "B로 이동" }));
  expect(await screen.findByRole("heading", { name: "장소 2" })).toBeInTheDocument();
  await act(async () => resolveA({ data: place(1) })); expect(screen.queryByRole("heading", { name: "장소 1" })).not.toBeInTheDocument();
});

test("API photo wins over the curated Mock photo and failed photos stay neutral", async () => {
  api.get.mockImplementation(async url => ({ data: url === "/api/folders" || url.endsWith("/reviews") ? [] : {
    id: 1, name: "서울숲", address: "서울", imageUrl: "/api-photo-fixture.jpg"
  } }));
  setup();
  const photo = await screen.findByRole("img", { name: "서울숲", exact: true });
  expect(photo).toHaveAttribute("src", "/api-photo-fixture.jpg");
  expect(screen.queryByRole("link", { name: "서울숲 사진 출처" })).not.toBeInTheDocument();
  fireEvent.error(photo);
  expect(screen.getByRole("img", { name: "서울숲 사진 정보 없음" })).toBeInTheDocument();
});

function mockFolders(server) {
  api.get.mockImplementation(async url => {
    if (url === "/api/folders") return {data:Object.keys(server).map(id => ({id,name:id === "1" ? "첫 폴더" : "둘째 폴더"}))};
    const folder = url.match(/^\/api\/folders\/(\d+)\/places$/);
    if (folder) return {data:[...server[folder[1]]]};
    return {data:url.endsWith("/reviews") ? [] : place(Number(url.split("/").pop()))};
  });
}

test("detail removes only the selected folder and preserves the other folder and shared saved state", async () => {
  const server={1:[place(1)],2:[place(1)]}; mockFolders(server);
  api.delete.mockImplementation(async url => { const id=url.split('/')[3]; server[id]=[]; return {data:{}}; });
  setup(); const toggle=await screen.findByRole('button',{name:'관심 장소 해제',exact:true});
  await waitFor(()=>expect(toggle).toBeEnabled()); fireEvent.click(toggle);
  const modal=await screen.findByRole('dialog',{name:'제거할 폴더 선택'});
  fireEvent.click(await within(modal).findByRole('button',{name:/둘째 폴더/}));
  const remove=within(modal).getByRole('button',{name:'선택한 폴더에서 제거'}); await waitFor(()=>expect(remove).toBeEnabled()); fireEvent.click(remove);
  await waitFor(()=>expect(screen.queryByRole('dialog',{name:'제거할 폴더 선택'})).not.toBeInTheDocument());
  expect(api.delete).toHaveBeenCalledTimes(1); expect(api.delete).toHaveBeenCalledWith('/api/folders/2/places/1');
  expect(server[1]).toHaveLength(1); expect(server[2]).toHaveLength(0);
  expect(screen.getByTestId('shared-saved-state')).toHaveTextContent('저장됨');
  expect(screen.getByRole('button',{name:'관심 장소 해제',exact:true})).toHaveAttribute('aria-pressed','true');
});

test("lost detail remove response preserves state until a read confirms it and never repeats DELETE", async () => {
  const server={1:[place(1)]}; mockFolders(server);
  api.delete.mockImplementation(async()=>{server[1]=[];throw new Error('response lost');});
  setup(); const toggle=await screen.findByRole('button',{name:'관심 장소 해제',exact:true}); await waitFor(()=>expect(toggle).toBeEnabled()); fireEvent.click(toggle);
  const check=await screen.findByRole('button',{name:'변경 결과 확인'});
  expect(api.delete).toHaveBeenCalledTimes(1); expect(screen.getByTestId('shared-saved-state')).toHaveTextContent('저장됨'); expect(toggle).toBeDisabled();
  fireEvent.click(check);
  await waitFor(()=>expect(screen.getByTestId('shared-saved-state')).toHaveTextContent('미저장'));
  expect(await screen.findByRole('button',{name:'관심 장소 추가',exact:true})).toHaveAttribute('aria-pressed','false');
  expect(api.delete).toHaveBeenCalledTimes(1);
});

test("detail never assumes a removal folder after a partial membership refresh failure", async () => {
  const server={1:[place(1)],2:[place(1)]}; mockFolders(server);
  setup(); const toggle=await screen.findByRole('button',{name:'관심 장소 해제',exact:true}); await waitFor(()=>expect(toggle).toBeEnabled());
  const read=api.get.getMockImplementation(); api.get.mockImplementation(async url=>{if(url==='/api/folders/2/places')throw new Error('failed');return read(url);});
  fireEvent.click(toggle); await screen.findByText('저장된 폴더를 확인하지 못했어요. 저장 상태를 다시 조회해 주세요.');
  expect(api.delete).not.toHaveBeenCalled(); expect(screen.getByTestId('shared-saved-state')).toHaveTextContent('저장됨');
  expect(screen.queryByRole('dialog',{name:'제거할 폴더 선택'})).not.toBeInTheDocument();
});
