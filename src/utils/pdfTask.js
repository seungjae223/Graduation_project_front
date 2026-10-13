// Rendering may finish after navigation. Validate again before asking the browser to save.
export async function savePreparedPdf(worker, isCurrent) {
  await worker.toPdf();
  if (!isCurrent()) throw new Error("출력 대상이 변경됐습니다.");
  await worker.save();
}

export function clonePdfContent(target, excludeSelector) {
  const clone = target.cloneNode(true);
  if (excludeSelector) clone.querySelectorAll(excludeSelector).forEach(element => element.remove());
  const included = element => !excludeSelector || !element.closest(excludeSelector);
  const sourceImages = Array.from(target.querySelectorAll("img")).filter(included);
  clone.querySelectorAll("img").forEach((image, index) => {
    if (sourceImages[index]?.currentSrc) {
      image.removeAttribute("srcset");
      image.src = sourceImages[index].currentSrc;
    }
  });
  const sourceCanvases = Array.from(target.querySelectorAll("canvas")).filter(included);
  clone.querySelectorAll("canvas").forEach((canvas, index) => {
    const source = sourceCanvases[index];
    if (!source.width || !source.height) throw new Error("PDF canvas 크기가 0입니다.");
    const image = document.createElement("img");
    try { image.src = source.toDataURL("image/png"); }
    catch { throw new Error("PDF canvas 이미지를 읽을 수 없습니다."); }
    image.style.cssText = source.style.cssText;
    image.width = source.width;
    image.height = source.height;
    canvas.replaceWith(image);
  });
  return clone;
}

// CSS page breaks and pixel rounding can leave empty canvas slices. Keep every
// slice containing actual content; omit only transparent/white/PDF-background
// pages, including the faint container shadow along their edges.
export function removeEmptyPdfPages(canvas, pageRatio, background = [255, 255, 255]) {
  const pageHeight = Math.floor(canvas.width * pageRatio);
  if (!pageHeight || canvas.height <= pageHeight) return canvas;
  const context = canvas.getContext("2d");
  const slices = [];
  for (let top = 0; top < canvas.height; top += pageHeight) {
    const height = Math.min(pageHeight, canvas.height - top);
    const pixels = context.getImageData(0, top, canvas.width, height).data;
    let hasContent = false;
    for (let i = 0; i < pixels.length; i += 4) {
      const white = pixels[i] === 255 && pixels[i + 1] === 255 && pixels[i + 2] === 255;
      const emptyBackground = Math.abs(pixels[i] - background[0]) <= 24 && Math.abs(pixels[i + 1] - background[1]) <= 24 && Math.abs(pixels[i + 2] - background[2]) <= 24;
      if (pixels[i + 3] && !white && !emptyBackground) { hasContent = true; break; }
    }
    if (hasContent) slices.push({ top, height });
  }
  const height = slices.reduce((total, slice) => total + slice.height, 0);
  if (!height || height === canvas.height) return canvas;
  const cropped = document.createElement("canvas");
  cropped.width = canvas.width;
  cropped.height = height;
  let destination = 0;
  for (const slice of slices) {
    cropped.getContext("2d").drawImage(canvas, 0, slice.top, canvas.width, slice.height, 0, destination, canvas.width, slice.height);
    destination += slice.height;
  }
  return cropped;
}

export async function waitForPdfImages(root, selector = "img") {
  await Promise.all(Array.from(root.querySelectorAll(selector), async image => {
    const label = describePdfImage(image);
    const failure = () => pdfImageFailure(label, "로드 실패");
    image.loading = "eager";
    if (!image.complete) await new Promise((resolve, reject) => {
      const finish = (error) => {
        clearTimeout(timer);
        image.removeEventListener("load", loaded);
        image.removeEventListener("error", failed);
        if (error) reject(error); else resolve();
      };
      const loaded = () => finish();
      const failed = () => finish(failure());
      const timer = setTimeout(() => finish(pdfImageFailure(label, "로드 시간 초과")), 15000);
      image.addEventListener("load", loaded, { once: true });
      image.addEventListener("error", failed, { once: true });
      if (image.complete) finish(image.naturalWidth > 0 ? null : failure());
    });
    if (!image.naturalWidth || !image.naturalHeight) throw failure();
    if (typeof image.decode === "function") {
      try { await image.decode(); } catch { throw failure(); }
    }
  }));
}

const describePdfImage = image => {
  if (image.alt) return image.alt;
  const url = new URL(image.currentSrc || image.src, window.location.href);
  return ["data:", "blob:"].includes(url.protocol) ? "내장 이미지" : url.pathname;
};
const pdfImageFailure = (asset, reason) => {
  // Never log a source URL's query (provider keys can be present there).
  console.error("PDF image failed", { asset, reason });
  return new Error(`PDF 이미지 ${reason}: ${asset}`);
};

// Freeze capture assets as decoded data URLs so html2pdf's second clone cannot
// re-fetch redirects without CORS, or lose blob/canvas pixels during cloning.
export async function preparePdfImages(root) {
  await waitForPdfImages(root);
  await Promise.all(Array.from(root.querySelectorAll("img"), async image => {
    const url = new URL(image.currentSrc || image.src, window.location.href);
    if (url.protocol === "data:") return;
    if (url.protocol === "http:" && /(^|\.)kakaocdn\.net$/.test(url.hostname)) url.protocol = "https:";
    const source = url.hostname === "mts.kakaocdn.net"
      ? `/.netlify/functions/pdf-map-image?url=${encodeURIComponent(url.href)}`
      : url.href;
    let response;
    try { response = await fetch(source, { signal: AbortSignal.timeout(15000) }); }
    catch { throw pdfImageFailure(describePdfImage(image), "가져오기 실패"); }
    if (!response.ok) throw pdfImageFailure(describePdfImage(image), `HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) throw new Error(`PDF 이미지 응답 형식 오류: ${image.alt || url.pathname}`);
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("PDF 이미지 변환 실패"));
      reader.readAsDataURL(blob);
    });
    image.removeAttribute("srcset");
    image.removeAttribute("crossorigin");
    image.src = dataUrl;
  }));
  for (const canvas of root.querySelectorAll("canvas")) {
    if (!canvas.width || !canvas.height) throw new Error("PDF canvas 크기가 0입니다.");
    const image = document.createElement("img");
    try { image.src = canvas.toDataURL("image/png"); }
    catch { throw new Error("PDF canvas 이미지를 읽을 수 없습니다."); }
    image.style.cssText = canvas.style.cssText;
    image.width = canvas.width;
    image.height = canvas.height;
    canvas.replaceWith(image);
  }
  await waitForPdfImages(root);
}
