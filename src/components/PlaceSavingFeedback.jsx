import FolderSelectModal from "../FolderSelectModal/FolderSelectModal";
import "./PlaceSavingFeedback.css";

export default function PlaceSavingFeedback({ saving }) {
  const { folders } = saving;
  return <div className="place-saving-feedback">
    {folders.account !== "anonymous" && folders.status === "loading" && <p role="status">저장 상태를 확인하는 중...</p>}
    {(folders.status === "error" || folders.data?.complete === false) && <div role="alert"><p>일부 저장 상태를 확인하지 못했어요. 확인된 정보는 유지됩니다.</p><button type="button" onClick={folders.retry}>저장 상태 다시 조회</button></div>}
    {saving.message && <p role="status">{saving.message}</p>}
    {saving.uncertain && <button type="button" onClick={saving.retryRead}>변경 결과 확인</button>}
  </div>;
}

export function PlaceSaveModal({ saving }) {
  return <FolderSelectModal open={saving.open} onClose={saving.close} onSave={saving.save} isSaving={saving.busy}
    folders={saving.modalFolders} contextKey={saving.target?.id || ""}
    allowCreate={!saving.removing && !saving.blocked} saveDisabled={saving.blocked}
    title={saving.removing ? "제거할 폴더 선택" : undefined}
    saveText={saving.removing ? "선택한 폴더에서 제거" : undefined} />;
}
