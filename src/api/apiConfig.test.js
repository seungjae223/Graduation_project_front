test("production without an API base rejects clearly before network dispatch", async () => {
  const mode = process.env.NODE_ENV;
  const base = process.env.REACT_APP_API_BASE_URL;
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  let api;
  try {
    process.env.NODE_ENV = "production";
    delete process.env.REACT_APP_API_BASE_URL;
    jest.isolateModules(() => { api = require("./api").default; });
    const adapter = jest.fn();
    await expect(api.get("/api/places", { adapter })).rejects.toThrow("REACT_APP_API_BASE_URL");
    expect(adapter).not.toHaveBeenCalled();
  } finally {
    process.env.NODE_ENV = mode;
    if (base === undefined) delete process.env.REACT_APP_API_BASE_URL;
    else process.env.REACT_APP_API_BASE_URL = base;
    log.mockRestore();
  }
});
