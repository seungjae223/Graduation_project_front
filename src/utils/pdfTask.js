// Rendering may finish after navigation. Validate again before asking the browser to save.
export async function savePreparedPdf(worker, isCurrent) {
  await worker.toPdf();
  if (!isCurrent()) throw new Error("출력 대상이 변경됐습니다.");
  await worker.save();
}
