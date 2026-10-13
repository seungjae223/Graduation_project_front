import { clonePdfContent, savePreparedPdf, waitForPdfImages, removeEmptyPdfPages } from "./pdfTask";

let errorLog;
beforeEach(() => { errorLog = jest.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { errorLog.mockRestore(); });

test("empty page slices and rounding overflow are removed without discarding even a single content pixel", () => {
  const drawImage = jest.fn();
  const context = jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage });
  const blank = new Uint8ClampedArray(100 * 150 * 4).fill(255);
  const content = blank.slice(); content[0] = 20;
  const source = { width: 100, height: 452, getContext: () => ({ getImageData: (_, top) => ({ data: top === 0 || top === 300 ? content : blank }) }) };
  const cropped = removeEmptyPdfPages(source, 1.5);
  expect(cropped.height).toBe(300);
  expect(drawImage).toHaveBeenNthCalledWith(1, source, 0, 0, 100, 150, 0, 0, 100, 150);
  expect(drawImage).toHaveBeenNthCalledWith(2, source, 0, 300, 100, 150, 0, 150, 100, 150);
  const nonEmpty = { ...source, getContext: () => ({ getImageData: () => ({ data: content }) }) };
  expect(removeEmptyPdfPages(nonEmpty, 1.5)).toBe(nonEmpty);
  context.mockRestore();
});

test("clone preserves canvas pixels without overwriting adjacent image sources", () => {
  const target = document.createElement("div");
  target.innerHTML = '<canvas width="20" height="10"></canvas><img src="/photo.png">';
  target.querySelector("canvas").toDataURL = jest.fn(() => "data:image/png;base64,canvas-pixels");
  Object.defineProperty(target.querySelector("img"), "currentSrc", { value: "http://localhost/photo.png" });
  const clone = clonePdfContent(target);
  expect(clone.querySelector("canvas")).toBeNull();
  expect(clone.querySelectorAll("img")[0].src).toBe("data:image/png;base64,canvas-pixels");
  expect(clone.querySelectorAll("img")[1].src).toBe("http://localhost/photo.png");
});

test("PDF excludes the live map rather than reading its WebGL canvas", () => {
  const target = document.createElement("div");
  target.innerHTML = '<div class="route-result-screen"><canvas></canvas></div><img src="/static-map.png">';
  const read = jest.fn(() => { throw new Error("tainted canvas"); });
  target.querySelector("canvas").toDataURL = read;
  const clone = clonePdfContent(target, ".route-result-screen");
  expect(read).not.toHaveBeenCalled();
  expect(clone.querySelector(".route-result-screen")).toBeNull();
  expect(clone.querySelector("img").src).toContain("static-map.png");
});

test("navigation during rendering prevents the browser save request", async () => {
  let finish;
  let current = true;
  const worker = { toPdf: jest.fn(() => new Promise(resolve => { finish = resolve; })), save: jest.fn() };
  const task = savePreparedPdf(worker, () => current);
  current = false;
  finish();
  await expect(task).rejects.toThrow("출력 대상이 변경됐습니다.");
  expect(worker.save).not.toHaveBeenCalled();
});

test("an already failed image rejects PDF export instead of silently omitting it", async () => {
  const image = { alt: "경로 지도", complete: true, naturalWidth: 0, addEventListener: jest.fn() };
  await expect(waitForPdfImages({ querySelectorAll: () => [image] })).rejects.toThrow("경로 지도");
  expect(image.addEventListener).not.toHaveBeenCalled();
});

test("loaded images must finish decoding before capture", async () => {
  let finish;
  const image = { complete: true, naturalWidth: 640, naturalHeight: 320,
    decode: jest.fn(() => new Promise(resolve => { finish = resolve; })) };
  const task = waitForPdfImages({ querySelectorAll: () => [image] });
  expect(image.decode).toHaveBeenCalledTimes(1);
  finish();
  await task;
});

test("pending image errors reject and remove listeners without printing query secrets", async () => {
  const handlers = {};
  const image = { src: "https://example.com/map.png?key=private-test-value", complete: false,
    addEventListener: jest.fn((event, handler) => { handlers[event] = handler; }), removeEventListener: jest.fn() };
  const task = waitForPdfImages({ querySelectorAll: () => [image] });
  handlers.error();
  await expect(task).rejects.toThrow("/map.png");
  await expect(task).rejects.not.toThrow("private-test-value");
  expect(image.removeEventListener).toHaveBeenCalledTimes(2);
});

test("pending images time out and release event listeners", async () => {
  jest.useFakeTimers();
  const image = { complete: false, addEventListener: jest.fn(), removeEventListener: jest.fn() };
  const task = waitForPdfImages({ querySelectorAll: () => [image] });
  jest.advanceTimersByTime(15000);
  await expect(task).rejects.toThrow("시간 초과");
  expect(image.removeEventListener).toHaveBeenCalledTimes(2);
  jest.useRealTimers();
});

test("valid output requests one save; renderer failure requests none", async () => {
  const worker = { toPdf: jest.fn().mockResolvedValue(), save: jest.fn().mockResolvedValue() };
  await savePreparedPdf(worker, () => true);
  expect(worker.save).toHaveBeenCalledTimes(1);
  worker.save.mockClear();
  worker.toPdf.mockRejectedValueOnce(new Error("renderer failed"));
  await expect(savePreparedPdf(worker, () => true)).rejects.toThrow("renderer failed");
  expect(worker.save).not.toHaveBeenCalled();
});
