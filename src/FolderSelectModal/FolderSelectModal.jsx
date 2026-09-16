import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../api/api";
import "./FolderSelectModal.css";

const FOLDERS_API = "/api/folders";

const getArrayData = (data) => {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.folders)) return data.folders;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.results)) return data.results;

  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.folders)) return data.data.folders;
  if (Array.isArray(data?.result?.content)) return data.result.content;

  return [];
};

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
  return getArrayData(data).map(normalizeFolder).filter(Boolean);
};

const mergeFolder = (folderList, folder) => {
  if (!folder) return folderList;

  const hasFolder = folderList.some(
    (item) => String(item.id) === String(folder.id)
  );

  if (hasFolder) {
    return folderList.map((item) =>
      String(item.id) === String(folder.id) ? folder : item
    );
  }

  return [...folderList, folder];
};

export const loadSavedFolders = async () => {
  const response = await api.get(FOLDERS_API);

  return normalizeFolderList(response.data);
};

export const savePlaceFolderLink = async (placeId, folder) => {
  if (!placeId || !folder?.id) return null;

  const response = await api.post(
    `${FOLDERS_API}/${encodeURIComponent(folder.id)}/places`,
    {
      placeId,
    }
  );

  return response.data;
};

export const removePlaceFolderLink = async (placeId, folderId) => {
  if (!placeId || !folderId) {
    console.warn("removePlaceFolderLink에는 placeId와 folderId가 모두 필요합니다.");
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

const DescriptionIcon = () => (
  <svg viewBox="0 0 34 34" width="30" height="30" aria-hidden="true">
    <path
      d="M6 9H22"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M6 16H17"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M6 23H12"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M21.6 25.2L15.5 27L17.3 20.9L25.6 12.6C26.4 11.8 27.7 11.8 28.5 12.6L29.9 14C30.7 14.8 30.7 16.1 29.9 16.9L21.6 25.2Z"
      fill="currentColor"
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
}) {
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [folderLoadError, setFolderLoadError] = useState("");

  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [createFolderError, setCreateFolderError] = useState("");

  const selectedFolderButtonRef = useRef(null);

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
      setFolders(nextFolders);
      setSelectedFolderId(getInitialFolderId(nextFolders));
    },
    [getInitialFolderId]
  );

  const fetchFolders = useCallback(async () => {
    setFolderLoadError("");

    if (Array.isArray(foldersProp)) {
      const nextFolders = normalizeFolderList(foldersProp);
      applyFolders(nextFolders);
      return nextFolders;
    }

    try {
      setIsLoadingFolders(true);

      const nextFolders = await loadSavedFolders();
      applyFolders(nextFolders);

      return nextFolders;
    } catch (error) {
      console.error("폴더 목록 조회 실패:", error);

      setFolders([]);
      setSelectedFolderId("");
      setFolderLoadError("폴더를 불러오지 못했습니다.");

      return [];
    } finally {
      setIsLoadingFolders(false);
    }
  }, [applyFolders, foldersProp]);

  useEffect(() => {
    if (!open) return;

    fetchFolders();
    setIsCreateFolderOpen(false);
    setNewFolderName("");
    setNewFolderDescription("");
    setCreateFolderError("");
  }, [fetchFolders, open]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || isCreateFolderOpen) return;

    selectedFolderButtonRef.current?.scrollIntoView({
      block: "nearest",
    });
  }, [folders.length, isCreateFolderOpen, open, selectedFolderId]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSaving && !isCreatingFolder) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCreatingFolder, isSaving, onClose, open]);

  const selectedFolder = useMemo(() => {
    return (
      folders.find((folder) => String(folder.id) === String(selectedFolderId)) ||
      null
    );
  }, [folders, selectedFolderId]);

  const resetCreateFolderForm = () => {
    setNewFolderName("");
    setNewFolderDescription("");
    setCreateFolderError("");
  };

  const handleBackdropClick = () => {
    if (isSaving || isCreatingFolder) return;
    onClose?.();
  };

  const handleOpenCreateFolder = () => {
    if (isSaving || isCreatingFolder || isLoadingFolders) return;

    resetCreateFolderForm();
    setIsCreateFolderOpen(true);
  };

  const handleCancelCreateFolder = () => {
    if (isSaving || isCreatingFolder) return;

    resetCreateFolderForm();
    setIsCreateFolderOpen(false);
  };

  const handleCreateFolder = async (event) => {
    event.preventDefault();

    if (isSaving || isCreatingFolder) return;

    const trimmedFolderName = newFolderName.trim();
    const trimmedFolderDescription = newFolderDescription.trim();

    if (!trimmedFolderName) {
      setCreateFolderError("폴더 이름을 입력해주세요.");
      return;
    }

    const duplicated = folders.some(
      (folder) =>
        folder.name.trim().toLowerCase() === trimmedFolderName.toLowerCase()
    );

    if (duplicated) {
      setCreateFolderError("이미 같은 이름의 폴더가 있습니다.");
      return;
    }

    try {
      setIsCreatingFolder(true);
      setCreateFolderError("");

      let createdFolder = null;

      if (onCreateFolder) {
        const result = await onCreateFolder({
          name: trimmedFolderName,
          description: trimmedFolderDescription,
        });

        createdFolder = normalizeFolder(result);
      } else {
        const response = await api.post(FOLDERS_API, {
          name: trimmedFolderName,
          description: trimmedFolderDescription,
        });

        createdFolder = normalizeFolder(response.data);
      }

      let latestFolders = folders;

      try {
        if (Array.isArray(foldersProp)) {
          latestFolders = normalizeFolderList(foldersProp);
        } else {
          latestFolders = await loadSavedFolders();
        }
      } catch (reloadError) {
        console.error("폴더 생성 후 목록 재조회 실패:", reloadError);
      }

      if (!createdFolder) {
        createdFolder =
          latestFolders.find(
            (folder) =>
              folder.name.trim().toLowerCase() ===
              trimmedFolderName.toLowerCase()
          ) || null;
      }

      if (!createdFolder) {
        setCreateFolderError(
          "폴더는 생성됐지만 폴더 정보를 확인하지 못했습니다. 다시 열어주세요."
        );
        return;
      }

      const nextFolders = mergeFolder(latestFolders, createdFolder);

      setFolders(nextFolders);
      setSelectedFolderId(createdFolder.id);
      resetCreateFolderForm();
      setIsCreateFolderOpen(false);
    } catch (error) {
      console.error("새 폴더 생성 실패:", error);
      setCreateFolderError("새 폴더 생성에 실패했습니다.");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleSaveClick = () => {
    if (!selectedFolder || isSaving || isCreatingFolder || isLoadingFolders) {
      return;
    }

    onSave?.(selectedFolder);
  };

  if (!open) return null;

  const modalElement = (
    <div
      className="folder-select-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      {isCreateFolderOpen ? (
        <section
          className="folder-create-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="folder-create-title"
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
              ×
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
                  maxLength={30}
                  autoComplete="off"
                  autoFocus
                  disabled={isSaving || isCreatingFolder}
                />
              </div>

              {createFolderError && (
                <p className="folder-create-error">{createFolderError}</p>
              )}

              <label
                className="folder-create-label folder-create-description-label"
                htmlFor="folder-description"
              >
                설명
              </label>

              <div className="folder-create-textarea-box">
                <span className="folder-create-textarea-icon">
                  <DescriptionIcon />
                </span>

                <textarea
                  id="folder-description"
                  value={newFolderDescription}
                  onChange={(event) =>
                    setNewFolderDescription(event.target.value)
                  }
                  placeholder="설명을 입력하세요 (선택)"
                  rows={3}
                  maxLength={80}
                  disabled={isSaving || isCreatingFolder}
                />
              </div>
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
                className="folder-create-submit-btn"
                disabled={
                  isSaving || isCreatingFolder || !newFolderName.trim()
                }
              >
                {isCreatingFolder ? "만드는 중..." : "+ 만들기"}
              </button>
            </footer>
          </form>
        </section>
      ) : (
        <section
          className="folder-select-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="folder-select-title"
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
            >
              ×
            </button>
          </header>

          <div className="folder-select-body">
            <div className="folder-select-list">
              {isLoadingFolders ? (
                <p className="folder-select-empty-text">
                  폴더를 불러오는 중입니다...
                </p>
              ) : folderLoadError ? (
                <p className="folder-select-empty-text">{folderLoadError}</p>
              ) : folders.length === 0 ? (
                <p className="folder-select-empty-text">
                  생성된 폴더가 없습니다.
                </p>
              ) : (
                folders.map((folder) => {
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
                      disabled={isSaving || isCreatingFolder}
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