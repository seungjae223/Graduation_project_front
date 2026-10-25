import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MyReviews from "./MyReviews";
import { getMyReviewsApi, editMyReviewApi, deleteMyReviewApi } from "../api/myReviewsApi";

jest.mock("../api/myReviewsApi", () => ({ getMyReviewsApi: jest.fn(), editMyReviewApi: jest.fn(), deleteMyReviewApi: jest.fn() }));
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => "account:test" }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: "account:test" }) }));

const view = () => render(<MemoryRouter><MyReviews /></MemoryRouter>);
beforeEach(() => jest.clearAllMocks());

test("my reviews show owned review details and link back to the place", async () => {
  getMyReviewsApi.mockResolvedValue({ page: 0, totalPages: 1, totalElements: 1, content: [{
    id: 7, placeId: 18, placeName: "오사카성", comment: "좋았어요",
    rating: 5, photos: ["https://example.com/review.jpg"],
  }] });
  view();
  expect(await screen.findByText("좋았어요")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "오사카성" })).toHaveAttribute("href", "/detail?id=18");
  expect(screen.getByText("작성한 리뷰 1개")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "작성한 리뷰 첨부 사진" })).toHaveAttribute("src", "https://example.com/review.jpg");
});

test("empty, failure and retry are not disguised as a successful empty list", async () => {
  getMyReviewsApi.mockRejectedValueOnce(new Error("offline"));
  getMyReviewsApi.mockResolvedValueOnce({ page: 0, totalPages: 0, totalElements: 0, content: [] });
  view();
  fireEvent.click(await screen.findByRole("button", { name: "다시 조회" }));
  expect(await screen.findByText("아직 작성한 리뷰가 없어요.")).toBeInTheDocument();
});

test("paging changes the actual authenticated review query", async () => {
  getMyReviewsApi.mockImplementation(async page => ({
    page, totalPages: 2, totalElements: 11,
    content: [{ id: page + 1, placeId: 10 + page, placeName: "방문 장소", comment: "후기 " + page, rating: 4, photos: [] }],
  }));
  view();
  await screen.findByText("후기 0");
  fireEvent.click(screen.getByRole("button", { name: "다음" }));
  expect(await screen.findByText("후기 1")).toBeInTheDocument();
  await waitFor(() => expect(getMyReviewsApi).toHaveBeenCalledWith(1, expect.any(Object)));
});


test("owner edits rating and comment through verified API read-back", async () => {
  const base = {id:7,placeId:18,placeName:"오사카성",rating:4,comment:"원본",photos:[]};
  getMyReviewsApi.mockResolvedValueOnce({page:0,totalPages:1,totalElements:1,content:[base]})
    .mockResolvedValue({page:0,totalPages:1,totalElements:1,content:[{...base,rating:5,comment:"수정됨"}]});
  editMyReviewApi.mockResolvedValue();
  view();
  await screen.findByText("원본");
  fireEvent.click(screen.getByRole("button",{name:"수정"}));
  fireEvent.change(screen.getByLabelText("리뷰 내용"),{target:{value:"수정됨"}});
  fireEvent.click(screen.getByRole("button",{name:"5점"}));
  expect(screen.getByRole("button",{name:"5점"})).toHaveAttribute("aria-pressed","true");
  fireEvent.click(screen.getByRole("button",{name:"수정 저장"}));
  await waitFor(() => expect(editMyReviewApi).toHaveBeenCalledWith(7,{comment:"수정됨",rating:5}));
  expect(await screen.findByText("리뷰를 수정했어요.")).toBeInTheDocument();
});

test("delete requires explicit confirmation and re-reads server list", async () => {
  const review = {id:7,placeId:18,placeName:"오사카성",rating:5,comment:"원본",photos:[]};
  getMyReviewsApi.mockResolvedValueOnce({page:0,totalPages:1,totalElements:1,content:[review]})
    .mockResolvedValue({page:0,totalPages:0,totalElements:0,content:[]});
  deleteMyReviewApi.mockResolvedValue();
  const confirm = jest.spyOn(window,"confirm").mockReturnValueOnce(false).mockReturnValue(true);
  view();
  await screen.findByText("원본");
  fireEvent.click(screen.getByRole("button",{name:"삭제"}));
  expect(deleteMyReviewApi).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"삭제"}));
  await waitFor(() => expect(deleteMyReviewApi).toHaveBeenCalledWith(7));
  expect(await screen.findByText("아직 작성한 리뷰가 없어요.")).toBeInTheDocument();
  confirm.mockRestore();
});

test("photo storage errors do not hide review text or the warning", async () => {
  getMyReviewsApi.mockResolvedValue({page:0,totalPages:1,totalElements:1,
    content:[{id:7,placeId:18,placeName:"오사카성",rating:5,comment:"글은 표시",photos:[],photosUnavailable:true}]});
  view();
  expect(await screen.findByText("글은 표시")).toBeInTheDocument();
  expect(screen.getByText(/첨부 사진 주소를 확인하지 못했어요/)).toBeInTheDocument();
});

test("review card without an image renders a safe placeholder instead of an empty src", async () => {
  getMyReviewsApi.mockResolvedValue({page:0,totalPages:1,totalElements:1,
    content:[{id:7,placeId:18,placeName:"사진 없는 장소",rating:5,comment:"본문 유지",photos:[]}]});
  view();
  expect(await screen.findByText("본문 유지")).toBeInTheDocument();
  expect(screen.getByRole("img",{name:"사진 없는 장소 사진 정보 없음"})).toBeInTheDocument();
  expect(screen.queryAllByRole("img", { hidden: true }).filter(image => image.getAttribute("src") === "")).toHaveLength(0);
});

test("a denied review-photo URL is reported rather than showing a broken image", async () => {
  getMyReviewsApi.mockResolvedValue({page:0,totalPages:1,totalElements:1,
    content:[{id:7,placeId:18,placeName:"오사카성",rating:5,comment:"사진 있는 리뷰",
      photos:["https://example.com/private.jpg"]}]});
  view();
  const photo = await screen.findByRole("img",{name:"작성한 리뷰 첨부 사진"});
  fireEvent.error(photo);
  expect(screen.getByText(/사진 저장소 접근 권한과 공개 주소를 확인해 주세요/)).toBeInTheDocument();
  expect(screen.queryByRole("img",{name:"작성한 리뷰 첨부 사진"})).not.toBeInTheDocument();
});

test("owned review thumbnail uses the reviewed place photo, not an uploaded review attachment", async () => {
  getMyReviewsApi.mockResolvedValue({page:0,totalPages:1,totalElements:1,
    content:[{id:9,placeId:3,placeName:"오사카성",region:"오사카",
      address:"1-1 Osakajo, Chuo Ward, Osaka",latitude:34.6873,longitude:135.5262,
      rating:5,comment:"사진 잘 보여요",photos:["https://example.com/review-attachment.jpg"]}]});
  view();
  await screen.findByText("사진 잘 보여요");
  const placePhoto=screen.getByRole("img",{name:"오사카성"});
  expect(placePhoto).toHaveAttribute("src",expect.stringContaining("/place-images/jp-3.jpg"));
  expect(screen.getByRole("img",{name:"작성한 리뷰 첨부 사진"}))
    .toHaveAttribute("src","https://example.com/review-attachment.jpg");
});
