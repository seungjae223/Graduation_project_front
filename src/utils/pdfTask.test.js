import { savePreparedPdf } from "./pdfTask";

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

test("valid output requests one save; renderer failure requests none", async () => {
  const worker = { toPdf: jest.fn().mockResolvedValue(), save: jest.fn().mockResolvedValue() };
  await savePreparedPdf(worker, () => true);
  expect(worker.save).toHaveBeenCalledTimes(1);
  worker.save.mockClear();
  worker.toPdf.mockRejectedValueOnce(new Error("renderer failed"));
  await expect(savePreparedPdf(worker, () => true)).rejects.toThrow("renderer failed");
  expect(worker.save).not.toHaveBeenCalled();
});
