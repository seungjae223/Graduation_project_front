import { fireEvent, render, screen } from "@testing-library/react";
import PlacePhoto from "./PlacePhoto";
import images from "../data/placeImages.json";

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

test("verified identity supplies the same local photo and attribution; errors keep the fallback neutral", () => {
  const photo = images[0];
  expect(photo).toBeDefined();
  const place = { id: 9999, name: photo.placeName, region: photo.region, address: photo.address, latitude: photo.latitude, longitude: photo.longitude };
  const clicked = jest.fn();
  render(<article onClick={clicked}><PlacePhoto place={place} alt={place.name} /></article>);
  const image = screen.getByRole("img", { name: place.name });
  expect(image).toHaveAttribute("src", photo.imageUrl);
  expect(image).toHaveAttribute("loading", "lazy");
  expect(image).toHaveAttribute("decoding", "async");
  const credit = screen.getByRole("link", { name: `${place.name} 사진 출처` });
  expect(credit).toHaveAttribute("href", `/place-images/credits.html#${photo.credit}`);
  fireEvent.click(credit);
  expect(clicked).not.toHaveBeenCalled();
  fireEvent.error(image);
  expect(screen.getByRole("img", { name: `${place.name} 사진 정보 없음` })).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
