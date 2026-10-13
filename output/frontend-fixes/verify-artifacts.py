import json, re
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[2]
out = Path(__file__).resolve().parent
result = json.loads((out / "result.json").read_text(encoding="utf-8"))
ids = [str(item["id"]) for item in result["items"]]
expected = [str(i) for i in range(1, 61)] + [f"C{i}" for i in range(1, 12)]
assert ids == expected, "Missing, duplicate or unordered result IDs"
missing = sorted({file for item in result["items"] for file in item["files"] if not Path(file).is_file()})
assert not missing, f"Missing source files: {missing}"
report = (out / "result.md").read_text(encoding="utf-8")
tail = report.split("## 전체 71개 결과표\n", 1)[1]
assert len([line for line in tail.splitlines() if re.match(r"^\| (?:[1-9][0-9]?|C[1-9][0-9]?) \|", line)]) == 71
linked = re.findall(r"\]\(<([^>]+)>\)", report)
missing_links = [file for file in linked if not Path(file).exists() and not file.endswith("browser-evidence.json")]
assert not missing_links, f"Missing report artifacts: {missing_links}"
shots = []
for path in sorted(out.glob("*.png")):
    with Image.open(path) as img:
        width, height = img.size
    stage = "actual-browser-capture"
    if path.name.startswith("pdf-dynamic-final-page-"):
        stage = "final-dynamic-coordinate-pdf-render"
    elif path.name.startswith("pdf-dynamic-page-"):
        stage = "before-final-pdf-width-fix"
    elif path.name.startswith("pdf-page-"):
        stage = "original-coordinate-pdf-render"
    elif path.name == "route-result-dynamic-coordinates-light-1366.png":
        stage = "before-sdk-svg-width-fix"
    shots.append({"name": path.name, "width": width, "height": height, "stage": stage})
evidence = {
    "environment": {"url": "http://localhost:3000", "project": str(root), "serverPid": 55784,
                    "browser": "Codex IAB", "productionBrowserTested": False},
    "responsiveWidths": [320, 390, 768, 1366],
    "measurementSource": "PNG actual pixel dimensions; interactive DOM and scroll observations are separately described in result.md",
    "screenshots": shots,
    "verifiedFlows": [
        "Home search -> Seoul -> Busan -> Back/Forward/Reload URL/input/results consistency",
        "Total save Enter/Space -> folder modal; saved-place delete Space -> confirm/cancel without detail navigation",
        "Folder create panel cancel -> new folder button focus; modal Tab/Shift+Tab/Escape containment",
        "Long document scrollY 212 and height 2719 preserved on open, PageDown/wheel and close; popup inner scroll 0 -> 844",
        "Inquiry waiting detail with no generated answer; completed Mock ADMIN answer read-only",
        "Mock ADMIN long title/email/body at 320px: viewport/scrollWidth 320; source fixtures restored",
        "Keyboard itinerary reorder and reset preserve same visit handle focus and memo association",
        "New onboarding3 tab -> back to onboarding2 -> Skip home; transition class/layer cleaned",
        "Dynamic address geocoding: both days ready, screen and downloaded final PDF 904m/4.8km match",
        "Final four PDF pages visually reviewed for maps, markers, green lines, detail content and full output width",
        "Restored original itinerary: 625m, provider SVG width1780/maxWidth none, viewport and scrollWidth1366"
    ],
    "cleanup": {"temporaryMockFixturesRestored": True, "ownMockAccountLoggedOut": True,
                "themeRestored": "light", "ownTabsClosed": True, "viewportOverrideReset": True,
                "ownServersStarted": 0, "userServerKept": True},
    "notTested": ["physical mobile touch", "Safari", "screen reader", "production browser runtime",
                  "forced fallback browser", "external map application display", "production writes", "real OAuth or email delivery"]
}
(out / "browser-evidence.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
tests = json.loads((out / "final-tests.json").read_text(encoding="utf-8"))
lint = json.loads((out / "final-lint.json").read_text(encoding="utf-8"))
build = (out / "final-build.log").read_text(encoding="utf-8-sig", errors="replace")
assert tests["success"] and tests["numPassedTests"] == 357 and tests["numPassedTestSuites"] == 60
assert tests["numFailedTests"] == 0 and tests["numPendingTests"] == 0
assert sum(f["errorCount"] + f["warningCount"] for f in lint) == 0
assert "Compiled successfully." in build
check = {"resultRows": len(ids), "sourceFileLinksChecked": len({f for item in result["items"] for f in item["files"]}),
         "screenshotFiles": len(shots), "testSuites": 60, "passedTests": 357, "failedTests": 0,
         "lintErrors": 0, "lintWarnings": 0, "productionBuild": "Compiled successfully",
         "missingLinks": [], "resultCounts": result["counts"]}
(out / "report-validation.json").write_text(json.dumps(check, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(check, ensure_ascii=False))

