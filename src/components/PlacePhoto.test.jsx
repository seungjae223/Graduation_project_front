import { fireEvent, render, screen } from "@testing-library/react";
import PlacePhoto from "./PlacePhoto";

test("a failed photo becomes a neutral placeholder; a different source can load", () => {
  const { rerender } = render(<PlacePhoto src="/first.jpg" alt="서울숲" />);
  fireEvent.error(screen.getByRole("img", { name: "서울숲" }));
  expect(screen.getByRole("img", { name: "서울숲 사진 정보 없음" })).toBeInTheDocument();
  rerender(<PlacePhoto src="/second.jpg" alt="서울숲" />);
  expect(screen.getByRole("img", { name: "서울숲" })).toHaveAttribute("src", "/second.jpg");
});
test("absent images do not request an unrelated fallback", () => {
  render(<PlacePhoto src="" alt="장소" />);
  expect(screen.queryByRole("img", { name: "장소" })).not.toBeInTheDocument();
  const placeholder = screen.getByRole("img", { name: "장소 사진 정보 없음" });
  expect(placeholder).not.toHaveAttribute("src");
  expect(screen.getAllByRole("img")).toEqual([placeholder]);
  expect(screen.getByText("사진 정보 없음")).toBeInTheDocument();
});
