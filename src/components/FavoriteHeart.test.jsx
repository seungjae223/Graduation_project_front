import { getByAttribute } from "../testQueries";
import { fireEvent, render, screen } from "@testing-library/react";
import FavoriteHeart from "./FavoriteHeart";

test("heart reflects only system favorite state and does not open the folder picker", () => {
  const toggleFavorite = jest.fn();
  const saving = { isLiked: id => id === 56, toggleFavorite, favoriteBlocked: false };
  render(<FavoriteHeart place={{ id: 56, name: "장소" }} saving={saving} />);
  const button = screen.getByRole("button", { name: "장소 좋아요 해제" });
  expect(button).toHaveAttribute("aria-pressed", "true");
  expect(button.textContent).toBe("");
  expect(getByAttribute("viewBox", button, "0 0 24 24")).not.toBeNull();
  fireEvent.click(button);
  expect(toggleFavorite).toHaveBeenCalledWith(expect.anything(), { id: 56, name: "장소" });
});

test("pending favorite confirmation keeps the button disabled", () => {
  render(<FavoriteHeart place={{ id: 1, name: "장소" }} saving={{
    isLiked: () => false, toggleFavorite: jest.fn(), favoriteBlocked: true,
  }} />);
  expect(screen.getByRole("button", { name: "장소 좋아요 추가" })).toBeDisabled();
});

test("unlike in favorites asks confirmation; cancel never sends write", () => {
  const saving = { isLiked:()=>true,toggleFavorite:jest.fn(),favoriteBlocked:false };
  const confirm = jest.spyOn(window,"confirm").mockReturnValueOnce(false).mockReturnValue(true);
  const { rerender } = render(<FavoriteHeart place={{id:19,name:"오사카성"}} saving={saving} confirmUnlike />);
  fireEvent.click(screen.getByRole("button",{name:"오사카성 좋아요 해제"}));
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining("좋아하는 장소"));
  expect(saving.toggleFavorite).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"오사카성 좋아요 해제"}));
  expect(saving.toggleFavorite).toHaveBeenCalledTimes(1);
  rerender(<FavoriteHeart place={{id:19,name:"오사카성"}} saving={saving} />);
  fireEvent.click(screen.getByRole("button",{name:"오사카성 좋아요 해제"}));
  expect(confirm).toHaveBeenCalledTimes(2);
  expect(saving.toggleFavorite).toHaveBeenCalledTimes(2);
  confirm.mockRestore();
});
