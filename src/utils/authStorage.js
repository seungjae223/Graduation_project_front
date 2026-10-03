export const ACCESS_TOKEN_KEY = "accessToken";
const PRIVATE_KEYS = new Set([
  ACCESS_TOKEN_KEY, "token", "tokenType", "refreshToken", "isLoggedIn", "keepLogin",
  "petapp_session_v1", "jakdang_access_token", "currentUser", "mock_current_user",
  "userEmail", "userName", "userNickname", "currentLocation", "currentLocationLabel",
  "userLocation", "locationPermissionAllowed", "locationPermissionRequestedAt",
  "socialLoginReturnTo", "recentPlaces", "mock_saved_route_results", "routeSelectedPlace",
  "routeDraftPlaces", "bookmarkedPlaceIds", "mock_user_inquiries",
]);

export function clearAuthenticatedUserStorage() {
  for (const name of ["localStorage", "sessionStorage"]) {
    try {
      const storage = window[name];
      for (const key of Object.keys(storage)) {
        if (PRIVATE_KEYS.has(key) || key.startsWith("nickname:") || key.startsWith("oauth_state_") ||
            key.startsWith("trip-fixed") || key.startsWith("route-fixed") || key.startsWith("route_fixed_time_map")) storage.removeItem(key);
      }
    } catch {
      // One unavailable store must not prevent clearing the other.
    }
  }
}

// Migrate legacy aliases in-place without changing persistence across reloads/tabs.
export function tokenCandidates() {
  const candidates = [];
  for (const name of ["localStorage", "sessionStorage"]) {
    try {
      const storage = window[name];
      const canonicalToken = storage.getItem(ACCESS_TOKEN_KEY);
      let token = canonicalToken || storage.getItem("token") || storage.getItem("jakdang_access_token");
      if (!token) {
        try {
          const old = JSON.parse(storage.getItem("petapp_session_v1"));
          token = old?.accessToken || old?.token;
        } catch { /* Invalid legacy data is not authentication. */ }
      }
      if (token) {
        candidates.push(token);
        // A failed migration must preserve the readable legacy key.
        if (!canonicalToken) storage.setItem(ACCESS_TOKEN_KEY, token);
      }
      for (const alias of ["token", "jakdang_access_token", "petapp_session_v1"]) storage.removeItem(alias);
    } catch { /* Try the other storage. */ }
  }
  return candidates;
}
