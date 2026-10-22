// Tab-local, account-scoped date draft; no server trip is created until a region is chosen.
const prefix = "nomango:v16:date-draft:";
const keyFor = account => prefix + encodeURIComponent(String(account || "anonymous"));
export const validISODate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value;
};
export const dateKey = date =>
  [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
export const inclusiveDays = (start,end) =>
  validISODate(start) && validISODate(end) && end >= start
    ? Math.round((Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) / 86400000) + 1 : 0;
export function readDateDraft(account) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(keyFor(account)) || "null");
    return saved && validISODate(saved.startDate) && validISODate(saved.endDate) &&
      saved.endDate >= saved.startDate
      ? { startDate:saved.startDate,endDate:saved.endDate } : null;
  } catch { return null; }
}
export function saveDateDraft(account, range) {
  if (!range || !validISODate(range.startDate) || !validISODate(range.endDate) ||
      range.endDate < range.startDate) return false;
  try { sessionStorage.setItem(keyFor(account),JSON.stringify(range)); return true; }
  catch { return false; }
}
export function clearDateDraft(account) {
  try { sessionStorage.removeItem(keyFor(account)); } catch { /* storage unavailable */ }
}
