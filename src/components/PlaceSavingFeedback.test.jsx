import { act, render, screen } from "@testing-library/react";
import PlaceSavingFeedback from "./PlaceSavingFeedback";

jest.mock("../FolderSelectModal/FolderSelectModal", () => () => null);

const saving = { folders: { account: "anonymous", status: "success" },
  favoriteStatus: "success", favoriteMessage: "좋아하는 장소에 추가했어요." };

test("search suppresses confirmed favorite messages without hiding error feedback", () => {
  const { rerender } = render(<PlaceSavingFeedback saving={saving} suppressFavoriteSuccess />);
  expect(screen.queryByText("좋아하는 장소에 추가했어요.")).not.toBeInTheDocument();
  rerender(<PlaceSavingFeedback saving={{ ...saving, favoriteStatus: "error",
    favoriteMessage: "좋아요를 변경하지 못했어요." }} suppressFavoriteSuccess />);
  expect(screen.getByText("좋아요를 변경하지 못했어요.")).toBeInTheDocument();
});

test("default detail feedback hides favorite success without hiding failure", () => {
  const { rerender } = render(<PlaceSavingFeedback saving={saving} />);
  expect(screen.queryByText("좋아하는 장소에 추가했어요.")).not.toBeInTheDocument();
  rerender(<PlaceSavingFeedback saving={{ ...saving, favoriteStatus: "error",
    favoriteMessage: "좋아요를 변경하지 못했어요." }} />);
  expect(screen.getByText("좋아요를 변경하지 못했어요.")).toBeInTheDocument();
});

test("ongoing folder refresh never flashes a loading panel over confirmed folder data", () => {
  const confirmed = { account: "account:test", status: "loading", data: { complete: true, folders: [], placeFolders: {} } };
  render(<PlaceSavingFeedback saving={{ folders: confirmed }} />);
  expect(screen.queryByText("저장 상태를 확인하는 중...")).not.toBeInTheDocument();
});

test("search hides the incidental initial folder-loading toast but preserves actual errors", () => {
  const pending = { account: "account:test", status: "loading", data: null };
  const { rerender } = render(<PlaceSavingFeedback saving={{ folders: pending }} suppressFolderLoading />);
  expect(screen.queryByText("저장 상태를 확인하는 중...")).not.toBeInTheDocument();
  rerender(<PlaceSavingFeedback saving={{ folders: { ...pending, status: "error" } }} suppressFolderLoading />);
  expect(screen.getByRole("alert")).toHaveTextContent("일부 저장 상태를 확인하지 못했어요");
  expect(screen.getByRole("button", { name: "저장 상태 다시 조회" })).toBeInTheDocument();
});

test("other screens retain initial folder loading guidance", () => {
  const pending = { account: "account:test", status: "loading", data: null };
  render(<PlaceSavingFeedback saving={{ folders: pending }} />);
  expect(screen.getByText("저장 상태를 확인하는 중...")).toBeInTheDocument();
});

test("bottom folder save confirmation fades out while errors remain until addressed",()=>{
  jest.useFakeTimers();
  try{
    const {rerender}=render(<PlaceSavingFeedback saving={{folders:{account:"account:test",status:"success"},
      mutationStatus:"success",message:"선택한 폴더에 저장했습니다."}}/>);
    expect(screen.getByText("선택한 폴더에 저장했습니다.")).toHaveClass("place-saving-success-toast");
    act(()=>jest.advanceTimersByTime(4500));
    expect(screen.queryByText("선택한 폴더에 저장했습니다.")).not.toBeInTheDocument();
    rerender(<PlaceSavingFeedback saving={{folders:{account:"account:test",status:"success"},
      mutationStatus:"error",message:"장소를 저장하지 못했어요."}}/>);
    expect(screen.getByText("장소를 저장하지 못했어요.")).toBeInTheDocument();
    act(()=>jest.advanceTimersByTime(4500));
    expect(screen.getByText("장소를 저장하지 못했어요.")).toBeInTheDocument();
  }finally{jest.useRealTimers()}
});
