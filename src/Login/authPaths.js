import { getReturnPathFromSearch, isSafeInternalPath } from "../utils/authRedirect";

export const getAuthReturnPath = (search) => getReturnPathFromSearch(search);

export function buildAuthPath(path, returnPath, parameters = {}) {
  const query = new URLSearchParams(parameters);
  query.set("returnTo", isSafeInternalPath(returnPath) ? returnPath : "/home");
  return `${path}?${query.toString()}`;
}
