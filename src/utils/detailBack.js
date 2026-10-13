export function returnFromDetail(navigate, historyIndex = window.history.state?.idx) {
  if (Number.isInteger(historyIndex) && historyIndex > 0) navigate(-1);
  else navigate("/recommend", { replace: true });
}
