import { useEffect, useRef } from "react";
import { getFoldersApi, getFolderPlacesApi } from "../api/placeApi";
import useReadQuery from "./useReadQuery";
import useSessionKey from "./useSessionKey";
import { getAuthSnapshot } from "./authState";
import { useSavedPlaces } from "../Context/SavedPlacesContext";

export const savedPlaceId = place => String(place?.placeId ?? place?.place?.id ?? place?.id ?? "");
// A successful empty folder replaces that folder; a failed folder keeps its last known records.
export async function readSavedFolderSnapshot(signal, previous) {
  if (signal?.aborted) throw new DOMException("취소됨", "AbortError");
  const rawFolders = await getFoldersApi({ signal });
  // A previous account's late list must not dispatch its dependent reads.
  if (signal?.aborted) throw new DOMException("취소됨", "AbortError");
  const folders = rawFolders.map(folder => ({ ...folder, id: String(folder.id ?? folder.folderId), name: folder.name ?? folder.folderName ?? folder.title }));
  if (folders.some(folder => !folder.id || folder.id === "undefined" || !folder.name)) throw new Error("폴더 응답을 확인할 수 없습니다.");
  const results = await Promise.allSettled(folders.map(folder => getFolderPlacesApi(folder.id, { signal })));
  if (signal?.aborted) throw new DOMException("취소됨", "AbortError");
  const failedFolderIds = [];
  folders.forEach((folder, index) => {
    if (results[index].status === "fulfilled") folder.places = results[index].value;
    else { failedFolderIds.push(folder.id); folder.places = previous?.folders.find(old => old.id === folder.id)?.places || []; }
  });
  const placeFolders = {};
  const byId = new Map();
  folders.forEach(folder => folder.places.forEach(record => {
    const id = savedPlaceId(record);
    if (!id) return;
    byId.set(id, { ...(record.place || record), id: record.placeId ?? record.place?.id ?? record.id });
    placeFolders[id] = [...new Set([...(placeFolders[id] || []), folder.id])];
  }));
  return { folders, placeFolders, places: [...byId.values()], failedFolderIds, complete: failedFolderIds.length === 0 };
}

export default function useFolderSavedPlaces() {
  const account = useSessionKey();
  const { syncSavedPlaces } = useSavedPlaces();
  const known = useRef({ account, data: null });
  if (known.current.account !== account) known.current = { account, data: null };
  const query = useReadQuery(`${account}:saved-folders`, signal => readSavedFolderSnapshot(signal, known.current.data), account !== "anonymous", () => getAuthSnapshot().accountKey === account);
  useEffect(() => {
    if (!query.data || getAuthSnapshot().accountKey !== account) return;
    known.current = { account, data: query.data };
    syncSavedPlaces?.(query.data.places, query.data.complete);
  }, [query.data, account, syncSavedPlaces]);
  return { ...query, account, data: query.data || known.current.data };
}
