// Run synchronously before paint so the user's saved app theme does not flash.
(function () {
  var saved = null;
  try { saved = localStorage.getItem("site-theme"); } catch (error) {}
  var theme = saved === "light" || saved === "dark" ? saved : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
