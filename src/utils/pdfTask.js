// Rendering may finish after navigation. Validate again before asking the browser to save.
export async function savePreparedPdf(worker, isCurrent) {
  await worker.toPdf();
  if (!isCurrent()) throw new Error("출력 대상이 변경됐습니다.");
  await worker.save();
}

export async function waitForPdfImages(root, selector = "img") {
  await Promise.all(Array.from(root.querySelectorAll(selector), image => {
    // A failed, complete image will never emit another load/error event.
    if (image.complete) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const finish = (error) => {
        clearTimeout(timer);
        image.removeEventListener("load", loaded);
        image.removeEventListener("error", loaded);
        if (error) reject(error); else resolve();
      };
      const loaded = () => finish();
      const timer = setTimeout(() => finish(new Error("PDF 이미지 로드 시간 초과")), 15000);
      image.addEventListener("load", loaded, { once: true });
      image.addEventListener("error", loaded, { once: true });
    });
  }));
}
