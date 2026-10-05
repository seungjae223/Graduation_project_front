import { logSafeApiError } from "../utils/safeLog";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../api/api";
import useModalFocus from "../utils/useModalFocus";
import "./FolderSelectModal.css";
import useReadQuery from "../utils/useReadQuery";
import useMutationTask from "../utils/useMutationTask";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import { requireList } from "../api/responseContract";

const FOLDERS_API = "/api/folders";

const getObjectData = (data) => {
  if (!data || Array.isArray(data)) return data;

  if (data.data && !Array.isArray(data.data)) {
    return getObjectData(data.data);
  }

  if (data.result && !Array.isArray(data.result)) {
    return getObjectData(data.result);
  }

  if (data.folder && !Array.isArray(data.folder)) {
    return getObjectData(data.folder);
  }

  return data;
};

const getTextValue = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;

    const text = String(value).trim();

    if (text) return text;
  }

  return "";
};

const normalizeFolder = (folder) => {
  const rawFolder = getObjectData(folder);

  const id =
    rawFolder?.id ??
    rawFolder?.folderId ??
    rawFolder?.folder_id ??
    rawFolder?.uuid;

  const name = getTextValue(
    rawFolder?.name,
    rawFolder?.folderName,
    rawFolder?.folder_name,
    rawFolder?.title
  );

  if (id === null || id === undefined || !name) return null;

  return {
    ...rawFolder,
    id: String(id),
    name,
    title: name,
    description: getTextValue(
      rawFolder?.description,
      rawFolder?.desc,
      rawFolder?.memo
    ),
  };
};

const normalizeFolderList = (data) => {
  return requireList(data).map(normalizeFolder).filter(Boolean);
};

export const loadSavedFolders = async () => {
  const response = await api.get(FOLDERS_API);

  return normalizeFolderList(response.data);
};

export const savePlaceFolderLink = async (placeId, folder) => {
  if (!placeId || !folder?.id) return null;

  const response = await api.post(
    `${FOLDERS_API}/${encodeURIComponent(folder.id)}/places/${encodeURIComponent(
      placeId
    )}`
  );

  return response.data;
};

export const removePlaceFolderLink = async (placeId, folderId) => {
  if (!placeId || !folderId) {
    logSafeApiError(undefined, "FolderSelectModal.jsx");
    return null;
  }

  const response = await api.delete(
    `${FOLDERS_API}/${encodeURIComponent(folderId)}/places/${encodeURIComponent(
      placeId
    )}`
  );

  return response.data;
};

const FolderIcon = ({ width = 30, height = 24 }) => (
  <svg viewBox="0 0 40 32" width={width} height={height} aria-hidden="true">
    <path
      d="M3.5 7.5C3.5 5.57 5.07 4 7 4H16.4C17.42 4 18.38 4.46 19.02 5.25L21.2 8H33C35.21 8 37 9.79 37 12V24.5C37 26.43 35.43 28 33.5 28H6.5C4.57 28 3 26.43 3 24.5V8C3 7.72 3.22 7.5 3.5 7.5Z"
      fill="#1da7e8"
    />
  </svg>
);

function FolderSelectModal({
  open,
  onClose,
  onSave,
  isSaving = false,
  defaultSelectedFolderId = "",
  folders: foldersProp,
  onCreateFolder,
  contextKey = "",
}) {
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [folderLoadError, setFolderLoadError] = useState("");

  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const account = useSessionKey();
  const taskKey = account + ":" + contextKey;
  const [folderOwner, setFolderOwner] = useState(taskKey);
  const [createOwner, setCreateOwner] = useState(taskKey);
  const visibleFolders = useMemo(() => folderOwner === taskKey ? folders : [], [folderOwner, taskKey, folders]);
  const showCreate = isCreateFolderOpen && createOwner === taskKey;
  const createTask = useMutationTask(taskKey);
  const isCreatingFolder = createTask.status === "running";
  const current = useRef({ open, taskKey, epoch: 0 });
  if (current.current.open !== open || current.current.taskKey !== taskKey) {
    current.current = { open, taskKey, epoch: current.current.epoch + 1 };
  }
  const [newFolderName, setNewFolderName] = useState("");
  const [createFolderError, setCreateFolderError] = useState("");

  useEffect(() => () => { current.current = { open: false, taskKey: null, epoch: current.current.epoch + 1 }; }, []);
  const autoSelect = useRef(true);
  const selectedFolderButtonRef = useRef(null);
  const dialogRef = useModalFocus({
    open,
    onClose,
    canClose: !isSaving && !isCreatingFolder,
    lockScroll: true,
  });

  const getInitialFolderId = useCallback(
    (nextFolders) => {
      const defaultId =
        defaultSelectedFolderId === null ||
        defaultSelectedFolderId === undefined
          ? ""
          : String(defaultSelectedFolderId);

      if (defaultId) {
        const matchedFolder = nextFolders.find(
          (folder) => String(folder.id) === defaultId
        );

        if (matchedFolder) return matchedFolder.id;
      }

      return nextFolders[0]?.id || "";
    },
    [defaultSelectedFolderId]
  );

  const applyFolders = useCallback(
    (nextFolders) => {
      setFolderOwner(taskKey);
      setFolders(nextFolders);
      setSelectedFolderId(getInitialFolderId(nextFolders));
    },
    [getInitialFolderId, taskKey]
  );

  const readFolders = async () => Array.isArray(foldersProp) ? normalizeFolderList(foldersProp) : loadSavedFolders();
  const listQuery = useReadQuery(taskKey + ":" + open + ":" + current.current.epoch, async signal => {
    if (Array.isArray(foldersProp)) return normalizeFolderList(foldersProp);
    const response = await api.get(FOLDERS_API, { signal });
    return normalizeFolderList(response.data);
  }, open && account !== "anonymous", () => getAuthSnapshot().accountKey === account);
  useEffect(() => {
    setIsLoadingFolders(listQuery.status === "loading");
    setFolderLoadError(listQuery.status === "error" ? "폴더를 불러오지 못했습니다." : "");
    if (listQuery.status === "success") {
      if (autoSelect.current) applyFolders(listQuery.data);
      else { setFolderOwner(taskKey); setFolders(listQuery.data); setSelectedFolderId(""); }
    }
  }, [listQuery.status, listQuery.data, applyFolders, taskKey]);
  useEffect(() => { setFolders([]); setSelectedFolderId(""); setIsCreateFolderOpen(false); }, [taskKey]);
  useEffect(() => {
    if (!open || isCreateFolderOpen) return;

    selectedFolderButtonRef.current?.scrollIntoView({
      block: "nearest",
    });
  }, [folders.length, isCreateFolderOpen, open, selectedFolderId]);

  const selectedFolder = useMemo(() => {
    return (
      visibleFolders.find((folder) => String(folder.id) === String(selectedFolderId)) ||
      null
    );
  }, [visibleFolders, selectedFolderId]);

  const resetCreateFolderForm = () => {
    setNewFolderName("");
    setCreateFolderError("");
  };

  const handleBackdropClick = () => {
    if (isSaving || isCreatingFolder) return;
    onClose?.();
  };

  const handleOpenCreateFolder = () => {
    if (isSaving || isCreatingFolder || isLoadingFolders) return;

    createTask.reset();
    setCreateOwner(taskKey);
    setIsCreateFolderOpen(true);
  };

  const handleCancelCreateFolder = () => {
    if (isSaving || isCreatingFolder) return;

    resetCreateFolderForm();
    setIsCreateFolderOpen(false);
  };

  const handleCreateFolder = async event => {
    event.preventDefault();
    if (isSaving || createTask.blocked || createTask.status === "success") return;
    const name = newFolderName.trim();
    if (!name || name.length > 255) { setCreateFolderError("폴더 이름은 공백만 입력할 수 없으며 1~255자로 입력해주세요."); return; }
    setCreateFolderError("");
    autoSelect.current = false;
    const epoch = current.current.epoch;
    await createTask.run(
      () => onCreateFolder ? onCreateFolder({ name }) : api.post(FOLDERS_API, { name }),
      async () => {
        const next = await readFolders();
        if (!current.current.open || current.current.taskKey !== taskKey || current.current.epoch !== epoch || getAuthSnapshot().accountKey !== account) throw new Error("화면 변경");
        setFolderOwner(taskKey); setFolders(next); setSelectedFolderId("");
      }, {
        failure: "새 폴더 생성에 실패했어요. 입력은 유지됩니다.",
        success: "폴더가 생성됐어요. 목록으로 돌아가 직접 폴더를 선택해 주세요. 장소는 아직 저장되지 않았습니다.",
        refreshFailure: "폴더는 생성됐지만 목록을 불러오지 못했어요.",
      }
    );
  };
  const handleSaveClick = () => {
    if (!selectedFolder || isSaving || isCreatingFolder || isLoadingFolders) {
      return;
    }

    onSave?.(selectedFolder);
  };

  if (!open || account === "anonymous") return null;

  const modalElement = (
    <div
      className="folder-select-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      {showCreate ? (
        <section
          ref={dialogRef}
          className="folder-create-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="folder-create-title"
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="folder-create-header">
            <h2 id="folder-create-title">새 폴더 만들기</h2>

            <button
              type="button"
              className="folder-create-close-btn"
              onClick={onClose}
              disabled={isSaving || isCreatingFolder}
              aria-label="새 폴더 만들기 닫기"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6L18 18M18 6L6 18" />
              </svg>
            </button>
          </header>

          <form className="folder-create-form" onSubmit={handleCreateFolder}>
            <div className="folder-create-body">
              <label className="folder-create-label" htmlFor="folder-name">
                폴더 이름
              </label>

              <div
                className={`folder-create-input-box ${
                  createFolderError ? "error" : ""
                }`}
              >
                <span className="folder-create-input-icon">
                  <FolderIcon width={28} height={22} />
                </span>

                <input
                  id="folder-name"
                  type="text"
                  value={newFolderName}
                  onChange={(event) => {
                    setNewFolderName(event.target.value);
                    setCreateFolderError("");
                  }}
                  placeholder="폴더 이름을 입력하세요"
                  maxLength={255}
                  autoComplete="off"
                  autoFocus
                  disabled={isSaving || createTask.blocked || createTask.status === "success"}
                />
              </div>

              {createTask.message && <p role="status">{createTask.status === "unknown" ? "폴더가 생성되었을 수 있어요. 목록을 확인해 주세요. 자동으로 다시 생성하지 않습니다." : createTask.message}</p>}
              {["unknown", "refreshError"].includes(createTask.status) && <button type="button" onClick={createTask.retryRead}>목록 다시 확인</button>}
              {isCreatingFolder && <p role="status">생성 요청 처리 중에는 닫을 수 없습니다.</p>}
              {createFolderError && (
                <p className="folder-create-error">{createFolderError}</p>
              )}

            </div>

            <footer className="folder-create-footer">
              <button
                type="button"
                className="folder-create-cancel-btn"
                onClick={handleCancelCreateFolder}
                disabled={isSaving || isCreatingFolder}
              >
                취소
              </button>

              <button
                type="submit"
                aria-label="폴더 생성"
                className="folder-create-submit-btn"
                disabled={
                  isSaving || createTask.blocked || createTask.status === "success" || !newFolderName.trim()
                }
              >
                {isCreatingFolder ? "만드는 중..." : "+ 만들기"}
              </button>
            </footer>
          </form>
        </section>
      ) : (
        <section
          ref={dialogRef}
          className="folder-select-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="folder-select-title"
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="folder-select-header">
            <h2 id="folder-select-title">폴더 선택</h2>

            <button
              type="button"
              className="folder-select-close-btn"
              onClick={onClose}
              disabled={isSaving || isCreatingFolder}
              aria-label="폴더 선택 닫기"
              data-modal-initial-focus
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6L18 18M18 6L6 18" />
              </svg>
            </button>
          </header>

          <div className="folder-select-body">
            <div className="folder-select-list">
              {isLoadingFolders ? (
                <p className="folder-select-empty-text">
                  폴더를 불러오는 중입니다...
                </p>
              ) : folderLoadError ? (
                <div><p className="folder-select-empty-text">{folderLoadError}</p><button type="button" onClick={listQuery.retry}>폴더 목록 다시 불러오기</button></div>
              ) : visibleFolders.length === 0 ? (
                <p className="folder-select-empty-text">
                  생성된 폴더가 없습니다.
                </p>
              ) : (
                visibleFolders.map((folder) => {
                  const selected =
                    String(selectedFolderId) === String(folder.id);

                  return (
                    <button
                      key={folder.id}
                      ref={selected ? selectedFolderButtonRef : null}
                      type="button"
                      className={`folder-select-option ${
                        selected ? "selected" : ""
                      }`}
                      onClick={() => setSelectedFolderId(folder.id)}
                      aria-pressed={selected}
                      disabled={isSaving || isCreatingFolder || isLoadingFolders}
                    >
                      <span className="folder-select-icon-circle">
                        <FolderIcon />
                      </span>

                      <span className="folder-select-option-name">
                        {folder.name}
                      </span>

                      <span className="folder-select-radio" aria-hidden="true">
                        {selected && (
                          <span className="folder-select-radio-dot" />
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <button
              type="button"
              className="folder-select-create-btn"
              onClick={handleOpenCreateFolder}
              disabled={isSaving || isCreatingFolder || isLoadingFolders}
            >
              + 새 폴더 만들기
            </button>
          </div>

          <footer className="folder-select-footer">
            <button
              type="button"
              className="folder-select-cancel-btn"
              onClick={onClose}
              disabled={isSaving || isCreatingFolder}
            >
              취소
            </button>

            <button
              type="button"
              className="folder-select-save-btn"
              onClick={handleSaveClick}
              disabled={
                isSaving ||
                isCreatingFolder ||
                isLoadingFolders ||
                !selectedFolder
              }
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
          </footer>
        </section>
      )}
    </div>
  );

  if (typeof document === "undefined") {
    return modalElement;
  }

  return createPortal(modalElement, document.body);
}

export default FolderSelectModal;
