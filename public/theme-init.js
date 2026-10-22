// Dark mode was removed. Clear its legacy preference before the first paint.
(function () {
  try { localStorage.removeItem("site-theme"); } catch (error) {}
  document.documentElement.dataset.theme = "light";
  document.documentElement.style.colorScheme = "light";
})();
