import { useEffect, useState } from "react";
import FolderSelectModal from "../FolderSelectModal/FolderSelectModal";
import { savedPlaceId } from "../utils/useFolderSavedPlaces";
import "./PlaceSavingFeedback.css";
import "./FolderCheckbox.css";

export default function PlaceSavingFeedback({ saving, suppressFolderLoading = false }) {
  const { folders } = saving;
  const [visible, setVisible] = useState(Boolean(saving.message));
  const success = saving.mutationStatus === "success" && Boolean(saving.message);
  useEffect(() => {
    setVisible(Boolean(saving.message));
    if (!success) return undefined;
    const timer = setTimeout(() => setVisible(false), 4400);
    return () => clearTimeout(timer);
  }, [saving.message, success]);
  return <div className="place-saving-feedback">
    {!suppressFolderLoading && folders.account !== "anonymous" && folders.status === "loading" && !folders.data && <p role="status">저장 상태를 확인하는 중...</p>}
    {(folders.status === "error" || folders.data?.complete === false) && <div role="alert"><p>일부 저장 상태를 확인하지 못했어요. 확인된 정보는 유지됩니다.</p><button type="button" onClick={folders.retry}>저장 상태 다시 조회</button></div>}
    {saving.message && visible && <p role="status" className={success ? "place-saving-success-toast" : undefined}>{saving.message}</p>}
    {/* Like/unlike success must never insert a banner and shift a place grid. */}
    {saving.favoriteMessage && ["error", "unknown", "refreshError"].includes(saving.favoriteStatus) &&
      <p role="status">{saving.favoriteMessage}</p>}
    {["unknown", "refreshError"].includes(saving.favoriteStatus) &&
      <button type="button" onClick={saving.retryFavoriteRead}>좋아요 상태 다시 확인</button>}
    {saving.uncertain && <button type="button" onClick={saving.retryRead}>변경 결과 확인</button>}
  </div>;
}

export function PlaceSaveModal({ saving }) {
  const savedFolderIds = saving.folders.data?.placeFolders?.[savedPlaceId(saving.target)] || [];
  return <FolderSelectModal open={saving.open} onClose={saving.close} onSave={saving.save} isSaving={saving.busy}
    folders={saving.modalFolders} contextKey={saving.target?.id || ""}
    onToggleFolder={!saving.removing ? saving.setFolderMembership : undefined}
    membershipMessage={["success", "running"].includes(saving.mutationStatus) ? "" : saving.message}
    onRetryMembership={saving.uncertain ? saving.retryRead : saving.folders.data?.complete === false ? saving.folders.retry : undefined}
    savedFolderIds={saving.removing ? [] : savedFolderIds} membershipComplete={saving.folders.data?.complete === true}
    allowCreate={!saving.removing} saveDisabled={saving.blocked}
    title={saving.removing ? "제거할 폴더 선택" : undefined}
    saveText={saving.removing ? "선택한 폴더에서 제거" : undefined} />;
}
