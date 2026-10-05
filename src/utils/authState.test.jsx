import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import useSessionKey from "./useSessionKey";
import { getAuthSnapshot, notifyAuthChange, subscribeAuth } from "./authState";
import { clearAuthenticatedUserStorage } from "./authStorage";
import { SavedPlacesProvider, useSavedPlaces } from "../Context/SavedPlacesContext";
import api from "../api/api";
const token = (sub, nonce = 1) => "header." + btoa(JSON.stringify({ sub, nonce })) + ".test-signature";
const login = (sub, nonce) => { localStorage.setItem("accessToken", token(sub, nonce)); notifyAuthChange(); };
beforeEach(() => { clearAuthenticatedUserStorage(); });
test("same-tab changes publish immediately; same-account credential rotation preserves account key", () => {
  const { result, unmount } = renderHook(() => useSessionKey()); expect(result.current).toBe("anonymous");
  act(() => login("A")); expect(result.current).toMatch(/^account:A:session:/); const account = result.current; const revision = getAuthSnapshot().credentialVersion;
  act(() => login("A", 2)); expect(result.current).toBe(account); expect(getAuthSnapshot().credentialVersion).toBeGreaterThan(revision);
  act(() => clearAuthenticatedUserStorage()); expect(result.current).toBe("anonymous");
  localStorage.setItem("accessToken", token("B")); act(() => window.dispatchEvent(new StorageEvent("storage"))); expect(result.current).toMatch(/^account:B:session:/); unmount();
});
test("saved-place context hides A data immediately and rejects a late A update", () => {
  let oldAdd; function Consumer() { const context = useSavedPlaces(); if (!oldAdd) oldAdd = context.addSavedPlace; return <><button onClick={() => context.addSavedPlace({ id: 1 })}>추가</button><p>{context.savedPlaces.length}개</p></>; }
  login("A"); render(<SavedPlacesProvider><Consumer /></SavedPlacesProvider>); fireEvent.click(screen.getByText("추가")); expect(screen.getByText("1개")).toBeInTheDocument();
  act(() => { clearAuthenticatedUserStorage(); login("B"); }); expect(screen.getByText("0개")).toBeInTheDocument();
  act(() => oldAdd({ id: 2 })); expect(screen.getByText("0개")).toBeInTheDocument();
});
test("late A 401 cannot clear B credentials", async () => {
  login("A"); let rejectA; let sent;
  const pending = api.get("/api/folders", { adapter: config => { sent = config; return new Promise((_, reject) => { rejectA = reject; }); } });
  await Promise.resolve(); await Promise.resolve(); login("B");
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  rejectA({ config: sent, response: { status: 401 } }); await expect(pending).rejects.toBeDefined();
  expect(getAuthSnapshot().accountKey).toMatch(/^account:B:session:/); expect(localStorage.getItem("accessToken")).toBe(token("B")); spy.mockRestore();
});

test("logout and login with the same subject still invalidate the old session", () => {
  login("A"); const previous = getAuthSnapshot().accountKey;
  clearAuthenticatedUserStorage(); login("A");
  expect(getAuthSnapshot().accountKey).not.toBe(previous);
});

test("expiry publishes without focus; subscribers share and clean up browser listeners", () => {
  jest.useFakeTimers();
  const add = jest.spyOn(window, "addEventListener");
  const remove = jest.spyOn(window, "removeEventListener");
  const change = jest.fn();
  const first = subscribeAuth(change); const second = subscribeAuth(jest.fn());
  const exp = Math.floor(Date.now() / 1000) + 2;
  localStorage.setItem("accessToken", "header." + btoa(JSON.stringify({ sub: "expiry-test", exp })) + ".test");
  notifyAuthChange(); change.mockClear(); jest.advanceTimersByTime(2100);
  expect(getAuthSnapshot().accountKey).toBe("anonymous"); expect(change).toHaveBeenCalledTimes(1);
  expect(add.mock.calls.filter(([type]) => type === "storage")).toHaveLength(1);
  first(); expect(remove.mock.calls.filter(([type]) => type === "storage")).toHaveLength(0);
  second(); expect(remove.mock.calls.filter(([type]) => type === "storage")).toHaveLength(1);
  expect(jest.getTimerCount()).toBe(0);
  add.mockRestore(); remove.mockRestore(); jest.useRealTimers();
});
