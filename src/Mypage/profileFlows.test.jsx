import { queryByClass, getByClass, getAllByClass, getByAttribute } from "../testQueries";
import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { SavedPlacesProvider } from "../Context/SavedPlacesContext";
import Inquiry from "./Inquiry";
import InquiryDetail from "./InquiryDetail";
import InquiryWrite from "./InquiryWrite";
import SavedPlaces from "./SavedPlaces";
import MyPage from "./MyPage";
import AdminInquiryPage from "../Admin/AdminInquiryPage/AdminInquiryPage";
import AdminInquiryWrite from "../Admin/AdminInquiryPage/AdminInquiryWrite";
import AdminAccessGuard, { roleFromUser } from "../Admin/AdminAccessGuard";
import RecentPlacesPage from "../RecentPlacesPage/RecentPlacesPage";
import MySchedule from "../MySchedule/MySchedule";
import api from "../api/api";
import { getMockUser } from "../mocks/authMock";
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => "account:test" }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: "account:test" }) }));
jest.mock("../config/mockConfig", () => ({ USE_MOCK: true }));
jest.mock("../mocks/authMock", () => ({ getMockUser: jest.fn(() => ({ name: "테스트", role: "USER" })), saveMockUser: jest.fn() }));
jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() }, getAccessToken: () => "test-session", getApiErrorMessage: (_, fallback) => fallback }));
const pending = (id = 2) => ({ id, title: "대기 문의 " + id, content: "전체 문의 내용 " + id, answer: "", answered: false, status: "waiting" });
const answered = () => ({ id: 1, title: "완료 문의", content: "문의 본문", answer: "실제 서버 답변", answered: true, status: "answered" });
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname + location.search}</output>; }
const setup = (node, path = "/") => render(<MemoryRouter initialEntries={[path]}><SavedPlacesProvider>{node}<Location /></SavedPlacesProvider></MemoryRouter>);
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  Element.prototype.scrollIntoView = jest.fn();
  getMockUser.mockReturnValue({ name: "테스트", role: "USER" });
  api.get.mockImplementation(async url => ({ data: url === "/api/folders" ? [] : url.includes("inquiries") ? [answered(), pending()] : url === "/api/recent-places" ? [] : {} }));
});
test("pending inquiry renders full content without invented answer or date", async () => {
  setup(<Routes><Route path="/inquiry/:id" element={<InquiryDetail />} /></Routes>, "/inquiry/2");
  expect(await screen.findByText("전체 문의 내용 2")).toBeInTheDocument();
  expect(screen.getByText("답변 대기")).toBeInTheDocument();
  expect(screen.queryByText(/조치가 완료|2024|운영팀|동기화 확인 완료/)).not.toBeInTheDocument();
});
test("real string answer renders by itself; completed without answer stays unconfirmed", async () => {
  api.get.mockResolvedValue({ data: [{ ...answered(), answer: "" }] });
  setup(<Routes><Route path="/inquiry/:id" element={<InquiryDetail />} /></Routes>, "/inquiry/1");
  expect(await screen.findByText("답변 내용 확인 필요")).toBeInTheDocument();
  expect(screen.getByText(/답변 완료 상태이지만/)).toBeInTheDocument();
  expect(screen.queryByText(/조치가 완료|2024/)).not.toBeInTheDocument();
});
test("pending user inquiries and completed admin inquiries are both readable", async () => {
  const view = setup(<Inquiry />, "/inquiry");
  await screen.findByRole("heading", { name: "대기 문의 2" });
  fireEvent.click(screen.getByRole("button", { name: "문의 내용 보기" }));
  expect(screen.getByTestId("location")).toHaveTextContent("/inquiry/2"); view.unmount();
  setup(<AdminInquiryPage />, "/admin/inquiry");
  const button = await screen.findByRole("button", { name: "답변 보기" });
  expect(button).toBeEnabled(); fireEvent.click(button);
  expect(screen.getByTestId("location")).toHaveTextContent("/admin/inquiry/write?id=1");
});
test("inquiry direct URL uses the same content wrapper as list, and malformed response is retryable", async () => {
  api.get.mockResolvedValue({ data: { content: [answered()] } });
  const view = setup(<Routes><Route path="/inquiry/:id" element={<InquiryDetail />} /></Routes>, "/inquiry/1");
  expect(await screen.findByText("실제 서버 답변")).toBeInTheDocument(); view.unmount();
  api.get.mockResolvedValue({ data: { unsupported: true } }); setup(<Inquiry />, "/inquiry");
  expect(await screen.findByRole("alert")).toHaveTextContent(/불러오지 못했습니다/);
  expect(screen.queryByText("등록된 문의사항이 없습니다.")).not.toBeInTheDocument();
  api.get.mockResolvedValue({ data: [] }); fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
  expect(await screen.findByText("등록된 문의사항이 없습니다.")).toBeInTheDocument();
});
test("late inquiry A cannot replace B after URL change", async () => {
  const old = deferred(); api.get.mockImplementation(() => old.promise);
  function View() { const navigate=useNavigate(); return <><button onClick={() => navigate('/inquiry/3')}>다음 문의</button><InquiryDetail /></>; }
  setup(<Routes><Route path="/inquiry/:id" element={<View />} /></Routes>, "/inquiry/2");
  api.get.mockResolvedValue({ data: [pending(3)] }); fireEvent.click(screen.getByRole('button',{name:'다음 문의'}));
  expect(await screen.findByText('전체 문의 내용 3')).toBeInTheDocument();
  await act(async () => old.resolve({ data: [pending()] }));
  expect(screen.queryByText('전체 문의 내용 2')).not.toBeInTheDocument();
});
test("admin editor waits for initial GET and then protects a draft", async () => {
  const get = deferred(); api.get.mockReturnValue(get.promise);
  setup(<AdminInquiryWrite />, "/admin/inquiry/write?id=2");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  await act(async () => get.resolve({ data: [pending()] }));
  const input = await screen.findByLabelText("WRITE A RESPONSE");
  fireEvent.change(input, { target: { value: "보존할 초안" } }); expect(input).toHaveValue("보존할 초안");
});
test("route state cannot hide admin 403 or enable sending", async () => {
  api.get.mockRejectedValue({ response: { status: 403 } });
  render(<MemoryRouter initialEntries={[{pathname:'/admin/inquiry/write',search:'?id=2',state:{inquiry:pending()}}]}><AdminInquiryWrite /></MemoryRouter>);
  expect(await screen.findByRole("alert")).toHaveTextContent("권한이 없습니다");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});
test("inquiry committed then response lost keeps input and only reads on result check", async () => {
  const rows=[]; api.get.mockImplementation(async () => ({data:rows}));
  api.post.mockImplementation(async (_,payload) => { rows.push({id:8,...payload}); throw new Error("response lost"); });
  setup(<InquiryWrite />, "/inquiry/write");
  fireEvent.change(screen.getByLabelText("제목"),{target:{value:"보존 제목"}}); fireEvent.change(screen.getByLabelText("내용"),{target:{value:"보존 내용"}});
  fireEvent.click(screen.getByRole("button",{name:"문의하기"}));
  const check=await screen.findByRole("button",{name:"등록 결과 확인"});
  expect(screen.getByLabelText("제목")).toHaveValue("보존 제목"); expect(screen.getByLabelText("내용")).toHaveValue("보존 내용");
  fireEvent.click(check); expect(await screen.findByRole('link',{name:'문의 #8 새 창에서 확인'})).toHaveAttribute('href','/inquiry/8');
  expect(api.post).toHaveBeenCalledTimes(1); expect(screen.getByRole('button',{name:'문의하기'})).toBeDisabled();
});
test("answer committed then response lost is confirmed by reading, never re-posting", async () => {
  const row=pending(); api.get.mockImplementation(async () => ({data:[row]}));
  api.post.mockImplementation(async (_,answer) => { Object.assign(row,{answer,answered:true,status:'answered'}); throw new Error('response lost'); });
  setup(<AdminInquiryWrite />, '/admin/inquiry/write?id=2'); const input=await screen.findByLabelText('WRITE A RESPONSE');
  fireEvent.change(input,{target:{value:'실제 반영된 답변'}}); fireEvent.click(screen.getByRole('button',{name:'답변 전송하기'}));
  fireEvent.click(await screen.findByRole('button',{name:'답변 결과 확인'}));
  expect(await screen.findByRole('alertdialog')).toBeInTheDocument(); expect(api.post).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('문의 답변')).toHaveValue('실제 반영된 답변');
});
test("folder counts provided by API avoid extra count reads beyond saved-state hydration", async () => {
  api.get.mockResolvedValue({data:[{id:1,name:'폴더 A',count:0}]}); setup(<SavedPlaces />, '/saved-places');
  await screen.findByText('폴더 A');
  // Saving state is hydrated once for hearts/folder membership. With an API
  // count the folder-list UI must not independently fetch its place count.
  await waitFor(() => expect(api.get.mock.calls.filter(([url]) =>
    url === '/api/folders/1/places')).toHaveLength(1));
  expect(api.get.mock.calls.filter(([url]) => url === '/api/folders/1/places')).toHaveLength(1);
});
test("one failed count leaves normal folders visible; failed place list retries the same folder", async () => {
  api.get.mockImplementation(async url => { if(url==='/api/folders')return{data:[{id:1,name:'폴더 A'},{id:2,name:'폴더 B'}]};if(url==='/api/folders/2/places')throw new Error('failed');return{data:[{id:71,name:'A 장소'}]};});
  setup(<SavedPlaces />, '/saved-places');
  // The title edits the name; the chevron explicitly opens the folder.
  fireEvent.click(await screen.findByRole('button',{name:'폴더 B 폴더로 이동'}));
  expect(await screen.findByRole('button',{name:'장소 목록 다시 불러오기'})).toBeInTheDocument();
  expect(screen.getByText('일부 폴더의 장소 개수를 확인하지 못했어요.')).toBeInTheDocument();
  expect(screen.queryByText('이 폴더에 저장된 장소가 없습니다.')).not.toBeInTheDocument();
  api.get.mockImplementation(async url => ({data:url==='/api/folders'?[{id:1,name:'폴더 A',count:1},{id:2,name:'폴더 B',count:1}]:[{id:72,name:'B 장소'}]}));
  fireEvent.click(screen.getByRole('button',{name:'장소 목록 다시 불러오기'}));
  expect(await screen.findByText('B 장소')).toBeInTheDocument();
});
test("an unconfirmed folder list does not display a real zero count", async () => {
  api.get.mockRejectedValue(new Error('failed')); setup(<SavedPlaces />, '/saved-places');
  expect(await screen.findByRole('button',{name:'폴더 목록 다시 불러오기'})).toBeInTheDocument();
  expect(screen.getByText('폴더 목록을 불러오지 못했어요.')).toBeInTheDocument();
  expect(screen.queryByText('총 0개의 장소를 저장했습니다')).not.toBeInTheDocument();
});
test("folder entry animates forward without a redundant in-page back button", async () => {
  api.get.mockImplementation(async url => ({data:
    url==="/api/folders" ? [{id:13,name:"도쿄 모음",count:1}] :
    [{id:71,name:"도쿄 장소",region:"도쿄",placeCategory:"LANDMARK"}]}));
  setup(<SavedPlaces />, "/saved-places");
  await screen.findByText("도쿄 모음");
  const folderButton = screen.getByRole("button",{name:"도쿄 모음 폴더로 이동"});
  expect(folderButton).toHaveClass("v14-saved-folder-forward");
  fireEvent.click(folderButton);
  expect(queryByClass(document, "v14-saved-view")).toHaveClass("v14-saved-view--forward");
  expect(screen.queryByRole("button",{name:/^폴더 목록$/})).not.toBeInTheDocument();
  // Header owns backward navigation; SavedPlaces no longer renders a second Back control.
});

test("favorite folder stays first and protected in bulk delete mode", async () => {
  let folders = [
    {id:1,name:"일반 폴더 A",systemType:null,count:0},
    {id:2,name:"일반 폴더 B",systemType:null,count:0},
    {id:3,name:"좋아하는 장소",systemType:"FAVORITES",count:0},
  ];
  api.get.mockImplementation(async url => ({data:
    url === "/api/folders" ? folders : []}));
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  api.delete.mockImplementation(async url => {
    const id = Number(url.split("/").pop());
    folders = folders.filter(folder => folder.id !== id);
    return {data:"삭제 완료"};
  });
  setup(<SavedPlaces />, "/saved-places");
  await screen.findByText("좋아하는 장소");
  const list = queryByClass(document.body, "v14-saved-folders");
  const firstFolder = within(list).getAllByRole("listitem")[0];
  expect(firstFolder).toHaveClass("is-favorites");
  expect(firstFolder).toHaveTextContent("좋아하는 장소");
  expect(getByAttribute("viewBox", getByClass(firstFolder, "v14-saved-folder-icon"), "0 0 24 24")).not.toBeNull();
  expect(screen.queryByRole("button", {name:"좋아하는 장소 폴더 삭제"})).not.toBeInTheDocument();
  expect(screen.queryByRole("button", {name:/선택한 폴더 \d+개 삭제하기/})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"폴더 삭제 선택"}));
  expect(screen.getByRole("button",{name:"폴더 선택 완료"})).toBeInTheDocument();
  expect(screen.getByRole("checkbox",{name:"좋아하는 장소 폴더 선택"})).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox",{name:"일반 폴더 A 폴더 선택"}));
  fireEvent.click(screen.getByRole("checkbox",{name:"일반 폴더 B 폴더 선택"}));
  const deleteButton = screen.getByRole("button",{name:"선택한 폴더 2개 삭제하기"});
  expect(queryByClass(document.body, "v14-saved-floating-delete")).toContainElement(deleteButton);
  fireEvent.click(deleteButton);
  await waitFor(() => expect(api.delete).toHaveBeenCalledTimes(2));
  expect(api.delete.mock.calls.map(([url])=>url))
    .toEqual(["/api/folders/1","/api/folders/2"]);
  confirm.mockRestore();
});

test("folder delete pill remains mounted and slides down when all folders are unchecked", async () => {
  api.get.mockImplementation(async url => ({data: url === "/api/folders"
    ? [{id:1,name:"체크할 폴더",count:0},{id:2,name:"좋아하는 장소",systemType:"FAVORITES",count:0}]
    : []}));
  setup(<SavedPlaces />, "/saved-places");
  await screen.findByText("체크할 폴더");
  const pill = queryByClass(document, "v14-saved-floating-delete");
  expect(pill).toBeInTheDocument();
  expect(pill).not.toHaveClass("is-visible");
  expect(pill).toHaveAttribute("aria-hidden","true");
  fireEvent.click(screen.getByRole("button",{name:"폴더 삭제 선택"}));
  fireEvent.click(screen.getByRole("checkbox",{name:"체크할 폴더 폴더 선택"}));
  expect(pill).toHaveClass("is-visible");
  expect(pill).toHaveAttribute("aria-hidden","false");
  fireEvent.click(screen.getByRole("checkbox",{name:"체크할 폴더 폴더 선택"}));
  expect(pill).toBeInTheDocument();
  expect(pill).not.toHaveClass("is-visible");
  expect(pill).toHaveAttribute("aria-hidden","true");
});

test("place delete pill stays mounted while the last selection is cleared", async () => {
  api.get.mockImplementation(async url => ({data:
    url==="/api/folders" ? [{id:1,name:"테스트 폴더",count:1}] :
    url==="/api/places/engagement" ? [{placeId:71,likeCount:0,reviewCount:0}] :
    [{id:71,name:"체험 장소",region:"오사카",placeCategory:"EXPERIENCE",placeCategoryLabel:"체험"}]}));
  setup(<SavedPlaces />, "/saved-places?folderId=1");
  await screen.findByRole("button",{name:"기본순 정렬, 누르면 좋아요순"});
  const pill = queryByClass(document, "v14-saved-floating-delete");
  expect(pill).not.toHaveClass("is-visible");
  fireEvent.click(screen.getByRole("button",{name:"장소 삭제 선택"}));
  fireEvent.click(screen.getByRole("checkbox",{name:"체험 장소 선택"}));
  expect(pill).toHaveClass("is-visible");
  fireEvent.click(screen.getByRole("checkbox",{name:"체험 장소 선택"}));
  expect(pill).toBeInTheDocument();
  expect(pill).not.toHaveClass("is-visible");
  expect(pill).toHaveAttribute("aria-hidden","true");
});

test("folder favorite state changes do not render expanding success banners", async () => {
  const { default: PlaceSavingFeedback } = require("../components/PlaceSavingFeedback");
  const fake = {
    folders:{account:"account:test",status:"success",data:{complete:true}},
    favoriteStatus:"success",favoriteMessage:"좋아하는 장소에 추가했어요.",
    message:"",uncertain:false,
  };
  const { rerender } = render(<PlaceSavingFeedback saving={fake} suppressFolderLoading />);
  expect(screen.queryByText("좋아하는 장소에 추가했어요.")).not.toBeInTheDocument();
  rerender(<PlaceSavingFeedback saving={{...fake,favoriteMessage:"좋아요를 해제했어요."}}
    suppressFavoriteSuccess suppressFolderLoading />);
  expect(screen.queryByText("좋아요를 해제했어요.")).not.toBeInTheDocument();
  rerender(<PlaceSavingFeedback saving={{...fake,favoriteStatus:"error",favoriteMessage:"좋아요를 변경하지 못했어요."}}
    suppressFavoriteSuccess suppressFolderLoading />);
  expect(screen.getByText("좋아요를 변경하지 못했어요.")).toBeInTheDocument();
});

test("folder body opens from outside the narrow rename title", async () => {
  api.get.mockImplementation(async url => ({ data: url === "/api/folders"
    ? [{ id: 3, name: "일본 여행", count: 0 }] : [] }));
  setup(<SavedPlaces />, "/saved-places");
  fireEvent.click(await screen.findByRole("button", { name: "일본 여행 폴더 카드 열기" }));
  expect(screen.getByTestId("location")).toHaveTextContent("/saved-places?folderId=3");
  expect(screen.queryByRole("textbox", { name: "일본 여행 새 폴더 이름" })).not.toBeInTheDocument();
});

test("ordinary folders can be renamed, but favorites cannot", async () => {
  let folderName = "오사카 여행";
  api.get.mockImplementation(async url => ({data: url==="/api/folders"
    ? [{id:1,name:"좋아하는 장소",systemType:"FAVORITES",count:0},
       {id:3,name:folderName,systemType:null,count:0}]
    : []}));
  api.patch.mockImplementation(async (url,body) => {
    if(url==="/api/folders/3") folderName=body.name;
    return {data:"폴더 이름 변경 완료"};
  });
  setup(<SavedPlaces />, "/saved-places");
  await screen.findByText("오사카 여행");
  expect(screen.queryByRole("button",{name:"좋아하는 장소 폴더 이름 수정"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"오사카 여행 폴더 이름 수정"}));
  const input = screen.getByRole("textbox",{name:"오사카 여행 새 폴더 이름"});
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.change(input,{target:{value:"일본 여행"}});
  fireEvent.click(screen.getByRole("button",{name:"폴더 이름 저장"}));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/api/folders/3",{name:"일본 여행"}));
  expect(await screen.findByRole("button",{name:"일본 여행 폴더 이름 수정"})).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"일본 여행 폴더로 이동"})).toBeInTheDocument();
});

test("folder details cycle the same default, likes and reviews sort controls as DestinationExplore", async () => {
  api.get.mockImplementation(async url => ({data:
    url === "/api/folders" ? [{id:1,name:"오사카 폴더",count:2}] :
    url === "/api/places/engagement" ?
      [{placeId:71,likeCount:2,reviewCount:8},{placeId:72,likeCount:7,reviewCount:1}] :
      [{id:71,name:"오사카 A",region:"오사카",placeCategory:"EXPERIENCE",placeCategoryLabel:"체험"},
       {id:72,name:"오사카 B",region:"오사카",placeCategory:"LANDMARK",placeCategoryLabel:"명소"}]}));
  setup(<SavedPlaces />, "/saved-places?folderId=1");
  const first = await screen.findByRole("button", {name:"기본순 정렬, 누르면 좋아요순"});
  expect(screen.getByRole("button",{name:"전체"})).toHaveAttribute("aria-pressed","true");
  expect(screen.getByRole("button",{name:"체험"})).toBeInTheDocument();
  fireEvent.click(first);
  expect(screen.getByRole("button",{name:"좋아요순 정렬, 누르면 리뷰순"})).toBeInTheDocument();
  await waitFor(() => expect(within(queryByClass(document.body, "v14-saved-items")).getAllByRole("heading", { level: 3 })
    .map(node => node.textContent)).toEqual(["오사카 B", "오사카 A"]));
  fireEvent.click(screen.getByRole("button",{name:"좋아요순 정렬, 누르면 리뷰순"}));
  expect(screen.getByRole("button",{name:"리뷰순 정렬, 누르면 기본순"})).toBeInTheDocument();
  await waitFor(() => expect(within(queryByClass(document.body, "v14-saved-items")).getAllByRole("heading", { level: 3 })
    .map(node => node.textContent)).toEqual(["오사카 A", "오사카 B"]));
  fireEvent.click(screen.getByRole("button",{name:"리뷰순 정렬, 누르면 기본순"}));
  expect(screen.getByRole("button",{name:"기본순 정렬, 누르면 좋아요순"})).toBeInTheDocument();
});

test("selection delete removes only checked places within the folder", async () => {
  let places=[{id:71,name:'서울 장소',placeCategory:'LANDMARK',placeCategoryLabel:'명소'}];
  api.get.mockImplementation(async url=>({data:url==='/api/folders'?[{id:1,name:'폴더 A',count:1}]:url.includes('/engagement')?[{placeId:71,likeCount:2,reviewCount:1}]:places}));
  api.delete.mockImplementation(async()=>{places=[];return{data:{}};});
  const confirm=jest.spyOn(window,'confirm').mockReturnValue(true);
  setup(<SavedPlaces />, '/saved-places?folderId=1');
  expect(await screen.findByRole('button',{name:'기본순 정렬, 누르면 좋아요순'})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'+ 새 장소 추가'})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/선택한 장소 \d+개 삭제하기/})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'장소 삭제 선택'}));
  expect(screen.getByRole('button',{name:'장소 선택 완료'})).toBeInTheDocument();
  expect(getAllByClass(document.body, "v14-saved-card-shell").find(item => item.classList.contains("is-selecting"))).not.toBeNull();
  fireEvent.click(screen.getByRole('checkbox',{name:'서울 장소 선택'}));
  const deleteButton = screen.getByRole('button',{name:'선택한 장소 1개 삭제하기'});
  expect(queryByClass(document.body, "v14-saved-floating-delete")).toContainElement(deleteButton);
  fireEvent.click(deleteButton);
  await waitFor(()=>expect(api.delete).toHaveBeenCalledWith('/api/folders/1/places/71'));
  expect(screen.getByTestId('location')).toHaveTextContent('/saved-places?folderId=1');
  confirm.mockRestore();
});
test("recent server empty does not resurrect local records; loading/error remain distinct", async () => {
  localStorage.setItem('recentPlaces',JSON.stringify([{id:99,name:'오래된 로컬 장소'}])); api.get.mockResolvedValue({data:[]});
  const view=setup(<RecentPlacesPage />, '/mypage/recent-places'); await screen.findByText('최근 본 장소가 없어요.'); expect(screen.queryByText('오래된 로컬 장소')).not.toBeInTheDocument(); view.unmount();
  api.get.mockImplementation(async url=>{if(url==='/api/recent-places')throw new Error('failed');return{data:[]};}); setup(<RecentPlacesPage />,'/mypage/recent-places');
  expect(await screen.findByText('최근 본 장소를 불러오지 못했어요.')).toBeInTheDocument(); expect(screen.queryByText('최근 본 장소가 없어요.')).not.toBeInTheDocument();
});
test("recent place uses the shared explore card with folder saving and detail action", async () => {
  let places=[];
  api.get.mockImplementation(async url=>({data:url==='/api/recent-places'?
    [{id:71,name:'최근 장소',imageUrl:'/actual-photo.jpg',placeCategory:'FOOD',placeCategoryLabel:'맛집'}]:
    url==='/api/folders'?[{id:1,name:'폴더 A'}]:places}));
  api.post.mockImplementation(async()=>{places=[{id:71,name:'최근 장소'}];return{data:{}};});
  setup(<RecentPlacesPage />,'/mypage/recent-places');
  expect(await screen.findByRole('img',{name:'최근 장소',exact:true})).toHaveAttribute('src','/actual-photo.jpg');
  expect(screen.getByText(/맛집/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'최근 장소 상세 보기'}));
  expect(screen.getByTestId('location')).toHaveTextContent('/detail?id=71');
});

test("mypage removes statistics and duplicate schedule settings, retaining useful links", async () => {
  api.get.mockResolvedValue({ data: { nickname: "여행자", email: "user@example.com", emailAvailable: true, provider: "LOCAL" } });
  setup(<MyPage />, "/mypage");
  await screen.findByRole("heading", { name: "여행자" });
  expect(screen.getByRole("link", { name: /저장한 장소/ })).toHaveAttribute("href", "/saved-places");
  expect(screen.getByRole("link", { name: /최근 본 장소/ })).toHaveAttribute("href", "/mypage/recent-places");
  expect(screen.getByRole("link", { name: /작성한 리뷰/ })).toHaveAttribute("href", "/mypage/reviews");
  expect(screen.getByRole("link", { name: /1:1 문의/ })).toHaveAttribute("href", "/inquiry");
  expect(screen.queryByText("화면 설정")).not.toBeInTheDocument();
  expect(screen.queryByText("내 일정 관리")).not.toBeInTheDocument();
  expect(screen.queryByText("활동 통계")).not.toBeInTheDocument();
  expect(api.get.mock.calls.map(([url]) => url)).toEqual(["/api/mypage/profile"]);
});

test("recent places retain the server's newest-first order without timestamp fields", async () => {
  api.get.mockResolvedValue({ data: [{ id: 71, name: "최근 A" }, { id: 72, name: "최근 B" }] });
  setup(<RecentPlacesPage />, '/mypage/recent-places');
  await screen.findByRole('button', { name: '최근 A 상세 보기' });
  expect(screen.getAllByRole('button', { name: /최근 [AB] 상세 보기/ }).map(button => button.getAttribute('aria-label')))
    .toEqual(['최근 A 상세 보기', '최근 B 상세 보기']);
});
test("admin role states deny user and unknown, allow ADMIN", async () => {
  const view=setup(<AdminAccessGuard><p>관리자 내용</p></AdminAccessGuard>,'/admin'); await screen.findByRole('heading',{name:'관리자 권한이 필요합니다'}); expect(screen.queryByText('관리자 내용')).not.toBeInTheDocument(); view.unmount();
  getMockUser.mockReturnValue({role:'ADMIN'}); const {unmount:unmountAdmin}=setup(<AdminAccessGuard><p>관리자 내용</p></AdminAccessGuard>,'/admin'); expect(await screen.findByText('관리자 내용')).toBeInTheDocument(); unmountAdmin();
  getMockUser.mockReturnValue({}); setup(<AdminAccessGuard><p>관리자 내용</p></AdminAccessGuard>,'/admin'); expect(await screen.findByRole('heading',{name:'관리자 권한을 확인하지 못했습니다'})).toBeInTheDocument();
  expect(roleFromUser({authorities:[{authority:'ROLE_ADMIN'}]})).toBe('admin');
});
test("undated server record remains accessible without a date-unknown tab or fake D-day", async () => {
  api.get.mockResolvedValue({data:[{id:1,title:'날짜 없는 일정'}]}); setup(<MySchedule />,'/my-schedule');
  expect(await screen.findByRole('heading',{name:'날짜 없는 일정'})).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'날짜 확인 필요'})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'날짜 미정'})).not.toBeInTheDocument();
  expect(screen.queryByText('D-Day')).not.toBeInTheDocument();
});
test("schedule focus refresh waits 30 seconds and retains the confirmed list on failure", async () => {
  const loadedAt = Date.now();
  const clock = jest.spyOn(Date, "now").mockReturnValue(loadedAt);
  try {
    api.get.mockResolvedValue({data:[{id:1,title:'확인된 일정',selectedDates:['2099-01-01']}]});
    setup(<MySchedule />,'/my-schedule');
    expect(await screen.findByRole('heading',{name:'확인된 일정'})).toBeInTheDocument();
    const reads = api.get.mock.calls.length;
    clock.mockReturnValue(loadedAt + 30000);
    fireEvent.focus(window);
    expect(api.get).toHaveBeenCalledTimes(reads);
    api.get.mockRejectedValue(new Error('failed'));
    clock.mockReturnValue(loadedAt + 30001);
    fireEvent.focus(window);
    expect(await screen.findByRole('alert')).toHaveTextContent('마지막으로 확인한 일정을 표시합니다.');
    expect(api.get).toHaveBeenCalledTimes(reads + 1);
    expect(screen.getByRole('heading',{name:'확인된 일정'})).toBeInTheDocument();
  } finally { clock.mockRestore(); }
});
