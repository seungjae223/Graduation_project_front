import { tokenCandidates } from "./authStorage";
const listeners = new Set();
let credential = null;
let initialized = false;
let expiryTimer = null;
let principal = null;
let session = 0;
let snapshot = { accountKey: "anonymous", credentialVersion: 0, authenticated: false };
const claims = token => {
  try { const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(atob(part)); } catch { return {}; }
};
function refresh() {
  initialized = true;
  const token = tokenCandidates().map(value => String(value).replace(/^Bearer\s+/i, "").trim())
    .find(value => value && (!claims(value).exp || Date.now() < claims(value).exp * 1000)) || null;
  if (token === credential) return false;
  credential = token;
  const payload = token ? claims(token) : {};
  const version = snapshot.credentialVersion + 1;
  const nextPrincipal = token ? String(payload.sub || payload.email || "session-" + version) : null;
  if (nextPrincipal !== principal) { ++session; principal = nextPrincipal; }
  // Claims identify a UI context only; they do not establish server permissions.
  snapshot = { accountKey: token ? `account:${principal}:session:${session}` : "anonymous", credentialVersion: version, authenticated: Boolean(token) };
  return true;
}
export function getAuthSnapshot() { if (!initialized) refresh(); return snapshot; }
function scheduleExpiry() {
  clearTimeout(expiryTimer);
  expiryTimer = null;
  const exp = credential && Number(claims(credential).exp);
  if (listeners.size && exp) expiryTimer = setTimeout(notifyAuthChange, Math.min(2147483647, Math.max(1, exp * 1000 - Date.now())));
}
export function notifyAuthChange() { if (refresh()) listeners.forEach(listener => listener()); scheduleExpiry(); }
export function subscribeAuth(listener) {
  if (listeners.size === 0) { window.addEventListener("storage", notifyAuthChange); window.addEventListener("focus", notifyAuthChange); }
  listeners.add(listener);
  notifyAuthChange();
  return () => { listeners.delete(listener); if (!listeners.size) { window.removeEventListener("storage", notifyAuthChange); window.removeEventListener("focus", notifyAuthChange); clearTimeout(expiryTimer); expiryTimer = null; } };
}
