import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { savePlaceToFolderApi, removePlaceFromFolderApi } from "../api/placeApi";
import { likePlaceApi, unlikePlaceApi } from "../api/favoritesApi";
import { useSavedPlaces } from "../Context/SavedPlacesContext";
import { getAuthSnapshot } from "./authState";
import { buildLoginPath } from "./authRedirect";
import useFolderSavedPlaces, { savedPlaceId } from "./useFolderSavedPlaces";
import useMutationTask from "./useMutationTask";

export default function usePlaceSaving() {
  const navigate = useNavigate();
  const folders = useFolderSavedPlaces();
  const context = useSavedPlaces();
  const task = useMutationTask(`${folders.account}:place-save`);
  const favoriteTask = useMutationTask(`${folders.account}:favorite`);
  const [target, setTarget] = useState(null);
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [mapping, setMapping] = useState(false);
  const [error, setError] = useState("");
  const [pendingFavorites, setPendingFavorites] = useState({});
  const active = useRef(folders.account);
  const selection = useRef(null);
  useEffect(() => { active.current = folders.account; selection.current = null; setMapping(false); setOpen(false); setTarget(null); setError(""); setPendingFavorites({}); return () => { active.current = null; selection.current = null; }; }, [folders.account]);
  // Optimistic heart painting only: server mutation and read-back are still required.
  // A definite failure rolls back the visual state, while an uncertain write stays locked.
  useEffect(() => {
    if (["success", "error"].includes(favoriteTask.status)) setPendingFavorites({});
  }, [favoriteTask.status]);
  const alive = () => active.current === folders.account && getAuthSnapshot().accountKey === folders.account;
  const isSaved = id => Boolean(folders.data?.placeFolders[String(id)]?.length) || context.isSaved(id);
  // A saved place is NOT necessarily liked: only the system FAVORITES folder counts.
  const favoritesFolder = folders.data?.folders.find(folder => folder.systemType === "FAVORITES");
  const isLiked = id => Object.prototype.hasOwnProperty.call(pendingFavorites, String(id))
    ? pendingFavorites[String(id)]
    : Boolean(favoritesFolder && folders.data?.placeFolders[String(id)]?.includes(favoritesFolder.id));
  const favoriteBlocked = folders.account !== "anonymous" &&
    (favoriteTask.blocked || task.blocked || mapping || folders.status !== "success" ||
      folders.data?.complete !== true || !favoritesFolder);
  const toggleFavorite = async (event, place) => {
    event?.stopPropagation();
    if (folders.account === "anonymous") { navigate(buildLoginPath()); return; }
    const id = savedPlaceId(place);
    if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0 || favoriteBlocked || open || !alive()) return;
    const targetFolderId = favoritesFolder.id;
    const shouldLike = !isLiked(id);
    setPendingFavorites(old => ({ ...old, [String(id)]: shouldLike }));
    await favoriteTask.run(
      () => shouldLike ? likePlaceApi(id) : unlikePlaceApi(id),
      async () => {
        const snapshot = await folders.read();
        if (!snapshot?.complete || !alive()) throw new Error("좋아요 최신 상태 확인 실패");
        const folder = snapshot.folders.find(item => item.systemType === "FAVORITES");
        if (!folder || folder.id !== targetFolderId ||
            Boolean(snapshot.placeFolders[id]?.includes(targetFolderId)) !== shouldLike) {
          throw new Error("좋아요 변경 결과가 예상과 다릅니다.");
        }
        return { confirmed: true };
      },
      { success: "",
        failure: "좋아요를 변경하지 못했어요.",
        refreshFailure: "요청 후 좋아요 상태를 확인하지 못했어요. 재조회해 주세요." }
    );
  };
  const apply = async (place, folder, remove, keepOpen = false) => {
    const id = savedPlaceId(place);
    if (!id || !folder?.id || task.blocked || !alive()) return;
    setError("");
    const read = async () => {
      const snapshot = await folders.read();
      if (!snapshot?.complete || !alive()) throw new Error("저장 상태 확인 실패");
      const present = snapshot.placeFolders[id]?.includes(String(folder.id)) || false;
      if (present === !remove) { if (!keepOpen) setOpen(false); return { confirmed: true }; }
      throw new Error("최신 저장 결과를 확인해 주세요.");
    };
    await task.run(
      () => { if (!alive()) throw new Error("화면 변경"); return remove ? removePlaceFromFolderApi({ folderId: folder.id, placeId: id }) : savePlaceToFolderApi({ folderId: folder.id, placeId: id }); },
      read,
      { failure: remove ? "폴더에서 제거하지 못했어요. 기존 저장 상태를 유지합니다." : "장소를 저장하지 못했어요.", success: remove ? "선택한 폴더에서 제거했습니다." : "선택한 폴더에 저장했습니다.", refreshFailure: "요청은 처리됐지만 최신 저장 상태를 확인하지 못했어요." }
    );
  };
  const toggle = async (event, place) => {
    event?.stopPropagation();
    if (folders.account === "anonymous") { navigate(buildLoginPath()); return; }
    if (task.blocked || folders.status === "loading" || selection.current) return;
    const id = savedPlaceId(place);
    if (!id || !alive()) return;
    const request = { account: folders.account, id };
    selection.current = request;
    try {
      setTarget(place); setError(""); task.reset();
      if (!isSaved(id)) { setRemoving(false); setOpen(true); return; }
      setMapping(true);
      const snapshot = await folders.read();
      if (selection.current !== request || !alive()) return;
      if (!snapshot?.complete) { setError("저장된 폴더를 확인하지 못했어요. 저장 상태를 다시 조회해 주세요."); return; }
      const ids = snapshot.placeFolders[id] || [];
      if (!ids.length) { setError("현재 저장 상태가 변경됐어요. 최신 목록을 확인해 주세요."); return; }
      setRemoving(true);
      if (ids.length === 1) await apply(place, snapshot.folders.find(folder => folder.id === ids[0]), true);
      else setOpen(true);
    } finally {
      if (selection.current === request) {
        selection.current = null;
        if (alive()) setMapping(false);
      }
    }
  };
  // Unlike toggle(), this always opens the ADD picker, even when the place is
  // already saved elsewhere. This keeps folder selection independent of hearts.
  const openFolderPicker = (event, place) => {
    event?.stopPropagation();
    if (folders.account === "anonymous") { navigate(buildLoginPath()); return; }
    if (task.blocked || folders.status === "loading" || selection.current || !alive()) return;
    if (!savedPlaceId(place)) return;
    task.reset();
    setTarget(place);
    setError("");
    setRemoving(false);
    setOpen(true);
  };
  // Checkbox mutations use the same read-back/uncertainty guard as legacy folder saving.
  const setFolderMembership = (folder, checked) => {
    if (!target || folders.data?.complete !== true || task.blocked) return;
    void apply(target, folder, !checked, true);
  };
  const modalFolders = removing ? folders.data?.folders.filter(folder => folders.data.placeFolders[savedPlaceId(target)]?.includes(folder.id)) : undefined;
  return { isSaved, isLiked, toggleFavorite, favoriteBlocked, favoriteStatus: favoriteTask.status,
    favoriteMessage: favoriteTask.message, retryFavoriteRead: favoriteTask.retryRead,
    toggle, openFolderPicker, setFolderMembership, target, isSavingId: mapping || task.status === "running" ? target?.id : null,
    blocked: mapping || task.blocked, busy: mapping || task.status === "running", message: error || task.message,
    mutationStatus: task.status,
    uncertain: ["unknown", "refreshError"].includes(task.status), retryRead: task.retryRead,
    folders, open, removing, modalFolders,
    close: () => { if (!mapping && task.status !== "running") setOpen(false); },
    save: folder => apply(target, folder, removing),
  };
}
