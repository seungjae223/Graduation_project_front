import { useRef } from "react";
import { getFoldersApi, getFolderPlacesApi } from "../api/placeApi";
import useReadQuery from "../utils/useReadQuery";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";

export default function useFavoriteFolders(open) {
  const account = useSessionKey();
  const confirmed = useRef({ account, places: new Map() });
  if (confirmed.current.account !== account) confirmed.current = { account, places: new Map() };
  return useReadQuery(account, async signal => {
    const owner = confirmed.current;
    const folders = await getFoldersApi({ signal });
    return Promise.all(folders.map(async folder => {
      const id = folder.id ?? folder.folderId;
      if (!id) throw new Error("관심장소 폴더 정보를 확인할 수 없습니다.");
      try {
        const places = await getFolderPlacesApi(id, { signal });
        if (!signal.aborted && confirmed.current === owner) owner.places.set(String(id), places);
        return { ...folder, id, title: folder.name || folder.title || "이름 없는 폴더", places, status: "success" };
      } catch (error) {
        if (signal.aborted) throw error;
        return { ...folder, id, title: folder.name || folder.title || "이름 없는 폴더", places: owner.places.get(String(id)) || [], status: "error" };
      }
    }));
  }, open, () => getAuthSnapshot().accountKey === account);
}
