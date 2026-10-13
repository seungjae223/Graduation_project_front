import { getSocialAuthorizationApi, loginApi } from "./authApi";
import { getAccessToken } from "./api";

jest.mock("../config/mockConfig", () => ({ USE_MOCK: true }));

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

test("cancelled mock login cannot mutate storage", async () => {
  await expect(loginApi({ email: "test@example.com" }, { isCurrent: () => false }))
    .rejects.toMatchObject({ code: "ERR_CANCELED" });
  expect(getAccessToken()).toBeNull();
});

test("mock social login remains authenticated under the existing policy", async () => {
  await expect(getSocialAuthorizationApi("google", { isCurrent: () => true }))
    .resolves.toMatchObject({ authenticated: true });
  expect(typeof getAccessToken()).toBe("string");
});
