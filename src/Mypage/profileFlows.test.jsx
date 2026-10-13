import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() }, getAccessToken: () => "test-session", getApiErrorMessage: (_, fallback) => fallback }));
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
test("folder counts provided by API do not fetch every place list", async () => {
  api.get.mockResolvedValue({data:[{id:1,name:'폴더 A',count:0}]}); setup(<SavedPlaces />, '/saved-places');
  await screen.findByText('폴더 A'); expect(api.get.mock.calls.map(([url])=>url)).toEqual(['/api/folders']);
});
test("one failed count leaves normal folders visible; failed place list retries the same folder", async () => {
  api.get.mockImplementation(async url => { if(url==='/api/folders')return{data:[{id:1,name:'폴더 A'},{id:2,name:'폴더 B'}]};if(url==='/api/folders/2/places')throw new Error('failed');return{data:[{id:71,name:'A 장소'}]};});
  setup(<SavedPlaces />, '/saved-places'); fireEvent.click(await screen.findByText('폴더 B'));
  expect(await screen.findByRole('button',{name:'장소 목록 다시 불러오기'})).toBeInTheDocument();
  expect(screen.getByText('장소 개수 미확인',{exact:true})).toBeInTheDocument();
  expect(screen.queryByText('이 폴더에 저장된 장소가 없습니다.')).not.toBeInTheDocument();
  api.get.mockImplementation(async url => ({data:url==='/api/folders'?[{id:1,name:'폴더 A',count:1},{id:2,name:'폴더 B',count:1}]:[{id:72,name:'B 장소'}]}));
  fireEvent.click(screen.getByRole('button',{name:'장소 목록 다시 불러오기'}));
  expect(await screen.findByRole('heading',{name:'B 장소'})).toBeInTheDocument();
});
test("an unconfirmed folder list does not display a real zero count", async () => {
  api.get.mockRejectedValue(new Error('failed')); setup(<SavedPlaces />, '/saved-places');
  expect(await screen.findByRole('button',{name:'폴더 목록 다시 불러오기'})).toBeInTheDocument();
  expect(screen.getByText('저장한 장소 개수 미확인')).toBeInTheDocument();
  expect(screen.queryByText('총 0개의 장소를 저장했습니다')).not.toBeInTheDocument();
});
test.each([['Enter','{Enter}'],['Space',' ']])("saved deletion %s never bubbles into detail navigation; missing rating/photo stay absent", async (_name, key) => {
  let places=[{id:71,name:'서울 장소',placeType:'ATTRACTION'}]; api.get.mockImplementation(async url=>({data:url==='/api/folders'?[{id:1,name:'폴더 A',count:1}]:places}));
  api.delete.mockImplementation(async()=>{places=[];return{data:{}};}); const confirm=jest.spyOn(window,'confirm').mockReturnValue(true);
  setup(<SavedPlaces />, '/saved-places?folderId=1');
  const remove=await screen.findByRole('button',{name:'장소 삭제'}); expect(screen.getByText('관광지')).toBeInTheDocument(); expect(screen.queryByText('4.8')).not.toBeInTheDocument();
  expect(screen.getByRole('img',{name:'서울 장소 사진 정보 없음'})).toBeInTheDocument();
  remove.focus(); userEvent.keyboard(key);
  await waitFor(()=>expect(api.delete).toHaveBeenCalledTimes(1)); expect(screen.getByTestId('location')).toHaveTextContent('/saved-places?folderId=1');
  confirm.mockRestore();
});
test("recent server empty does not resurrect local records; loading/error remain distinct", async () => {
  localStorage.setItem('recentPlaces',JSON.stringify([{id:99,name:'오래된 로컬 장소'}])); api.get.mockResolvedValue({data:[]});
  const view=setup(<RecentPlacesPage />, '/mypage/recent-places'); await screen.findByText('최근 본 장소가 없어요.'); expect(screen.queryByText('오래된 로컬 장소')).not.toBeInTheDocument(); view.unmount();
  api.get.mockImplementation(async url=>{if(url==='/api/recent-places')throw new Error('failed');return{data:[]};}); setup(<RecentPlacesPage />,'/mypage/recent-places');
  expect(await screen.findByText('최근 본 장소를 불러오지 못했습니다.')).toBeInTheDocument(); expect(screen.queryByText('최근 본 장소가 없어요.')).not.toBeInTheDocument();
});
test("recent photo aliases and category label render; saving calls the folder API and detail uses a link", async () => {
  let places=[]; api.get.mockImplementation(async url=>({data:url==='/api/recent-places'?[{id:71,name:'최근 장소',imageUrl:'/actual-photo.jpg',placeType:'RESTAURANT'}]:url==='/api/folders'?[{id:1,name:'폴더 A'}]:places}));
  api.post.mockImplementation(async()=>{places=[{id:71,name:'최근 장소'}];return{data:{}};}); setup(<RecentPlacesPage />,'/mypage/recent-places');
  expect(await screen.findByRole('img',{name:'최근 장소',exact:true})).toHaveAttribute('src','/actual-photo.jpg'); expect(screen.getByText('음식점')).toBeInTheDocument();
  const save=screen.getByRole('button',{name:'최근 장소 저장',exact:true}); await waitFor(()=>expect(save).toBeEnabled()); fireEvent.click(save);
  const confirmSave=await screen.findByRole('button',{name:'저장',exact:true}); await waitFor(()=>expect(confirmSave).toBeEnabled()); fireEvent.click(confirmSave);
  await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/api/folders/1/places/71'));
  expect(await screen.findByRole('button',{name:'최근 장소 저장 해제'})).toHaveAttribute('aria-pressed','true');
  expect(screen.getByRole('link',{name:'최근 장소',exact:true})).toHaveAttribute('href','/detail?id=71');
});
test("statistics error never becomes zero; retry preserves a real zero value", async () => {
  api.get.mockRejectedValue(new Error('failed')); setup(<MyPage />,'/mypage'); await screen.findByText('활동 통계를 불러오지 못했습니다.');
  expect(screen.queryByText('0',{selector:'strong'})).not.toBeInTheDocument();
  api.get.mockResolvedValue({data:{visitedPlacesCount:0,savedPlacesCount:3,reviewsCount:1}}); fireEvent.click(screen.getByRole('button',{name:'통계 다시 불러오기'}));
  expect(await screen.findByText('0',{selector:'strong'})).toBeInTheDocument();
  expect(screen.getByText('여행 일정')).toBeInTheDocument();
  expect(screen.queryByText('다녀온 곳')).not.toBeInTheDocument();
});

test("recent places retain the server's newest-first order without timestamp fields", async () => {
  api.get.mockResolvedValue({ data: [{ id: 71, name: "최근 A" }, { id: 72, name: "최근 B" }] });
  setup(<RecentPlacesPage />, '/mypage/recent-places');
  await screen.findByRole('link', { name: '최근 A', exact: true });
  expect(screen.getAllByRole('link', { name: /최근 [AB]/ }).map(link => link.textContent)).toEqual(['최근 A', '최근 B']);
});
test("admin role states deny user and unknown, allow ADMIN", async () => {
  const view=setup(<AdminAccessGuard><p>관리자 내용</p></AdminAccessGuard>,'/admin'); await screen.findByRole('heading',{name:'관리자 권한이 필요합니다'}); expect(screen.queryByText('관리자 내용')).not.toBeInTheDocument(); view.unmount();
  getMockUser.mockReturnValue({role:'ADMIN'}); const {unmount:unmountAdmin}=setup(<AdminAccessGuard><p>관리자 내용</p></AdminAccessGuard>,'/admin'); expect(await screen.findByText('관리자 내용')).toBeInTheDocument(); unmountAdmin();
  getMockUser.mockReturnValue({}); setup(<AdminAccessGuard><p>관리자 내용</p></AdminAccessGuard>,'/admin'); expect(await screen.findByRole('heading',{name:'관리자 권한을 확인하지 못했습니다'})).toBeInTheDocument();
  expect(roleFromUser({authorities:[{authority:'ROLE_ADMIN'}]})).toBe('admin');
});
test("undated trips are separate from upcoming and use no fabricated photo", async () => {
  api.get.mockResolvedValue({data:[{id:1,title:'날짜 없는 일정'}]}); setup(<MySchedule />,'/my-schedule');
  fireEvent.click(await screen.findByRole('button',{name:'날짜 미정'}));
  expect(await screen.findByRole('heading',{name:'날짜 없는 일정'})).toBeInTheDocument(); expect(screen.queryByText('D-Day')).not.toBeInTheDocument();
});
test("schedule refresh failure retains the same account's confirmed list", async () => {
  api.get.mockResolvedValue({data:[{id:1,title:'확인된 일정',selectedDates:['2099-01-01']}]}); setup(<MySchedule />,'/my-schedule');
  expect(await screen.findByRole('heading',{name:'확인된 일정'})).toBeInTheDocument();
  api.get.mockRejectedValue(new Error('failed')); fireEvent.focus(window);
  expect(await screen.findByRole('alert')).toHaveTextContent('마지막으로 확인한 일정을 표시합니다.');
  expect(screen.getByRole('heading',{name:'확인된 일정'})).toBeInTheDocument();
});
