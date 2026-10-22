import { readFileSync } from "fs";
import path from "path";

const css = readFileSync(path.join(__dirname, "TripListCard.css"), "utf8");
test("upcoming paper clips the airplane hover motion to its own ticket field", () => {
  expect(css).toContain(".v15-ticket-flight-zone");
  expect(css).toContain("overflow:hidden");
  expect(css).toContain("@keyframes v15-ticket-takeoff");
  expect(css).toContain("prefers-reduced-motion:reduce");
});
test("past trips have a jagged single-paper edge and no detachable stub", () => {
  expect(css).toContain(".v15-trip-card.is-past .v15-ticket-paper");
  expect(css).toContain("clip-path:polygon");
  expect(css).toContain(".v15-past-boarding-label");
  expect(css).toContain(".v15-ticket-barcode");
  expect(css).not.toContain(".v15-ticket-detached-stub");
});
