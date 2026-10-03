// Run synchronously before paint so the existing theme does not flash.
(function () {
  var saved = null;
  try { saved = localStorage.getItem("site-theme"); } catch (error) {}
  var theme = saved === "light" || saved === "dark"
    ? saved
    : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
