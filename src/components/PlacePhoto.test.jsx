import { fireEvent, render, screen } from "@testing-library/react";
import PlacePhoto from "./PlacePhoto";
import images from "../data/placeImages.json";
import * as imageResolver from "../utils/placeImageResolver";

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
test("a verified remote thumb gets one Commons file redirect fallback before a neutral placeholder", () => {
  const photo = images.find(entry => entry.placeName === "코엑스 별마당도서관");
  const place = { id: 187, name: photo.placeName, region: photo.region, address: photo.address,
    latitude: photo.latitude, longitude: photo.longitude };
  render(<PlacePhoto place={place} alt={photo.placeName} />);
  const image = screen.getByRole("img", { name: photo.placeName });
  expect(image).toHaveAttribute("src", photo.imageUrl);
  fireEvent.error(image);
  expect(screen.getByRole("img", { name: photo.placeName })).toHaveAttribute(
    "src", expect.stringContaining("Special:Redirect/file/Books_in_Byeolmadang_Library")
  );
  fireEvent.error(screen.getByRole("img", { name: photo.placeName }));
  const empty = screen.getByRole("img", { name: photo.placeName + " 사진 정보 없음" });
  expect(empty).toHaveAttribute("data-photo-reason", "load-failed");
  expect(screen.queryByRole("link", { name: photo.placeName + " 사진 출처" })).not.toBeInTheDocument();
});

test("a missing photo mapping stays distinguishable from a network failure", () => {
  render(<PlacePhoto place={{name:"미등록",region:"서울",latitude:37,longitude:127}} alt="미등록" />);
  expect(screen.getByRole("img", { name: "미등록 사진 정보 없음" }))
    .toHaveAttribute("data-photo-reason", "not-mapped");
});

test("curated no-crop photos remain fully visible after a landscape image loads", () => {
  const photo = { ...images[0], preserveFullImage: true };
  const resolve = jest.spyOn(imageResolver, "resolvePlaceImage").mockReturnValue(photo);
  try {
    const { rerender } = render(<PlacePhoto place={{}} alt="원본 비율" className="photo-frame" />);
    const image = screen.getByRole("img", { name: "원본 비율" });
    expect(image).toHaveStyle({ objectFit: "contain" });
    expect(image).toHaveClass("photo-frame");
    Object.defineProperties(image, {
      naturalWidth: { configurable: true, value: 1200 },
      naturalHeight: { configurable: true, value: 800 }
    });
    fireEvent.load(image);
    expect(image).toHaveStyle({ objectFit: "contain" });

    resolve.mockReturnValue({ ...photo, preserveFullImage: false });
    rerender(<PlacePhoto place={{}} alt="원본 비율" className="photo-frame" />);
    expect(screen.getByRole("img", { name: "원본 비율" })).toHaveStyle({ objectFit: "cover" });
  } finally {
    resolve.mockRestore();
  }
});
