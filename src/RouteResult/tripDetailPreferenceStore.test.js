import { DEFAULT_TRIP_DISPLAY, readTripDisplayPreferences, saveTripDisplayPreferences } from "./tripDetailPreferenceStore";

beforeEach(() => window.localStorage.clear());

test("missing or cleared site data defaults to list and manual", () => {
  expect(readTripDisplayPreferences(12, "account:one")).toEqual(DEFAULT_TRIP_DISPLAY);
  expect(saveTripDisplayPreferences(12, "account:one", { view: "tabs", version: "optimized" })).toBe(true);
  expect(readTripDisplayPreferences(12, "account:one")).toEqual({ view: "tabs", version: "optimized" });
  window.localStorage.clear();
  expect(readTripDisplayPreferences(12, "account:one")).toEqual(DEFAULT_TRIP_DISPLAY);
});

test("updates each switch independently and restores it after navigating away", () => {
  expect(saveTripDisplayPreferences(12, "account:one", { view: "tabs" })).toBe(true);
  expect(readTripDisplayPreferences(12, "account:one")).toEqual({ view: "tabs", version: "manual" });
  expect(saveTripDisplayPreferences(12, "account:one", { version: "optimized" })).toBe(true);
  expect(readTripDisplayPreferences(12, "account:one")).toEqual({ view: "tabs", version: "optimized" });
  expect(saveTripDisplayPreferences(12, "account:one", { view: "list" })).toBe(true);
  expect(readTripDisplayPreferences(12, "account:one")).toEqual({ view: "list", version: "optimized" });
});

test("different trips and accounts never share display choices", () => {
  saveTripDisplayPreferences(12, "account:one:session:5", { view: "tabs", version: "optimized" });
  expect(readTripDisplayPreferences(12, "account:one:session:6")).toEqual({ view: "tabs", version: "optimized" });
  expect(readTripDisplayPreferences(13, "account:one:session:5")).toEqual(DEFAULT_TRIP_DISPLAY);
  expect(readTripDisplayPreferences(12, "account:two")).toEqual(DEFAULT_TRIP_DISPLAY);
});

test("invalid, corrupted, or anonymous saved preferences safely fall back", () => {
  expect(saveTripDisplayPreferences(12, "anonymous", { view: "tabs" })).toBe(false);
  expect(saveTripDisplayPreferences("not-a-trip", "account:one", { view: "tabs" })).toBe(false);
  saveTripDisplayPreferences(12, "account:one", { view: "tabs" });
  const key = window.localStorage.key(0);
  expect(key).toMatch(/^nomango:trip-display:v1:12:/);
  window.localStorage.setItem(key, "{invalid json");
  expect(readTripDisplayPreferences(12, "account:one")).toEqual(DEFAULT_TRIP_DISPLAY);
  window.localStorage.setItem(key, JSON.stringify({ view: "unknown", version: "invalid" }));
  expect(readTripDisplayPreferences(12, "account:one")).toEqual(DEFAULT_TRIP_DISPLAY);
});
