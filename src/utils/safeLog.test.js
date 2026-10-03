import { logSafeApiError } from "./safeLog";

test("logs no request, response, URL, password or token", () => {
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  logSafeApiError({ response: { status: 401, data: "secret" }, config: {
    data: { password: "secret" }, headers: { Authorization: "secret" },
    url: "/callback?code=secret&state=secret",
  } }, "login");
  expect(spy).toHaveBeenCalledWith("Request failed", { context: "login", status: 401 });
  spy.mockRestore();
});
