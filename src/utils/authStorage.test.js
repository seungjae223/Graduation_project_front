import { clearAuthenticatedUserStorage, tokenCandidates } from "./authStorage";

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
test("clears personal data in both stores but retains preferences", () => {
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of ["token", "accessToken", "nickname:test@example.com", "currentLocation", "userLocation", "oauth_state_google", "recentPlaces", "currentUser"]) storage.setItem(key, "private");
    storage.setItem("site-theme", "dark");
  }
  clearAuthenticatedUserStorage();
  for (const storage of [localStorage, sessionStorage]) expect(Object.keys(storage)).toEqual(["site-theme"]);
});

test("existing login is readable when storage writes fail", () => {
  localStorage.setItem("accessToken", "existing-token");
  const write = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
  try {
    expect(tokenCandidates()).toEqual(["existing-token"]);
    expect(write).not.toHaveBeenCalled();
  } finally { write.mockRestore(); }
});
test("failed legacy migration does not discard the existing login", () => {
  sessionStorage.setItem("token", "legacy-token");
  const write = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
  try {
    expect(tokenCandidates()).toEqual(["legacy-token"]);
    expect(sessionStorage.getItem("token")).toBe("legacy-token");
  } finally { write.mockRestore(); }
});
test("migrates legacy session token without making it persistent", () => {
  sessionStorage.setItem("token", "existing-token");
  expect(tokenCandidates()).toEqual(["existing-token"]);
  expect(sessionStorage.getItem("accessToken")).toBe("existing-token");
  expect(sessionStorage.getItem("token")).toBeNull();
  expect(localStorage.getItem("accessToken")).toBeNull();
});
