import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { savePlaceToFolderApi, removePlaceFromFolderApi } from "../api/placeApi";
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
  const [target, setTarget] = useState(null);
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [mapping, setMapping] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(folders.account);
  const selection = useRef(null);
  useEffect(() => { active.current = folders.account; selection.current = null; setMapping(false); setOpen(false); setTarget(null); setError(""); return () => { active.current = null; selection.current = null; }; }, [folders.account]);
  const alive = () => active.current === folders.account && getAuthSnapshot().accountKey === folders.account;
  const isSaved = id => Boolean(folders.data?.placeFolders[String(id)]?.length) || context.isSaved(id);
  const apply = async (place, folder, remove) => {
    const id = savedPlaceId(place);
    if (!id || !folder?.id || task.blocked || !alive()) return;
    setError("");
    const read = async () => {
      const snapshot = await folders.read();
      if (!snapshot?.complete || !alive()) throw new Error("저장 상태 확인 실패");
      const present = snapshot.placeFolders[id]?.includes(String(folder.id)) || false;
      if (present === !remove) { setOpen(false); return { confirmed: true }; }
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
  const modalFolders = removing ? folders.data?.folders.filter(folder => folders.data.placeFolders[savedPlaceId(target)]?.includes(folder.id)) : undefined;
  return { isSaved, toggle, target, isSavingId: mapping || task.status === "running" ? target?.id : null,
    blocked: mapping || task.blocked, busy: mapping || task.status === "running", message: error || task.message,
    uncertain: ["unknown", "refreshError"].includes(task.status), retryRead: task.retryRead,
    folders, open, removing, modalFolders,
    close: () => { if (!mapping && task.status !== "running") setOpen(false); },
    save: folder => apply(target, folder, removing),
  };
}
