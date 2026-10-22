import fs from "fs";
import path from "path";
import { render, screen } from "@testing-library/react";
import PlaceExploreCard from "./PlaceExploreCard";

jest.mock("./PlacePhoto", () => ({ __esModule: true, default: () => <span data-testid="place-photo" /> }));

const place = { id: 41, name: "도쿄 장소", region: "도쿄", placeCategory: "LANDMARK" };
const createSaving = (status, blocked = false) => ({
  blocked,
  folders: { account: "account:test", status },
  isLiked: () => false,
  toggleFavorite: jest.fn(),
  openFolderPicker: jest.fn(),
});

test("all shared place cards keep folder controls mounted during a favorite-state refresh", () => {
  const saving = createSaving("success");
  const { rerender } = render(<PlaceExploreCard place={place} saving={saving} onDetail={() => {}} onSchedule={() => {}} />);
  const folder = screen.getByRole("button", { name: "도쿄 장소 폴더에 저장" });
  expect(folder).toBeEnabled();

  rerender(<PlaceExploreCard place={place} saving={createSaving("loading")} onDetail={() => {}} onSchedule={() => {}} />);
  expect(screen.getByRole("button", { name: "도쿄 장소 폴더에 저장" })).toBe(folder);
  expect(folder).toBeDisabled();

  const css = fs.readFileSync(path.join(__dirname, "PlaceExploreCard.css"), "utf8");
  expect(css).toMatch(/\.place-explore-card \.place-explore-actions \.place-explore-folder:disabled\s*\{\s*opacity:\s*1/);

  rerender(<PlaceExploreCard place={place} saving={createSaving("success")} onDetail={() => {}} onSchedule={() => {}} />);
  expect(folder).toBeEnabled();
});
