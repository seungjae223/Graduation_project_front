import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./FolderSelectModal.css";

const DEFAULT_FOLDERS = [
  { id: "all", name: "전체 저장됨", description: "" },
  { id: "solo", name: "나홀로 여행", description: "" },
  { id: "family", name: "가족과 함께", description: "" },
  { id: "food", name: "맛집 탐방", description: "" },
];

const FOLDER_STORAGE_KEY = "travel_saved_folders";
const SAVED_PLACE_FOLDER_STORAGE_KEY = "travel_saved_place_folder_map";

const safeParseJson = (value, fallbackValue) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallbackValue;
  }
};

const readStorage = (key, fallbackValue) => {
  if (typeof window === "undefined") return fallbackValue;

  const savedValue = window.localStorage.getItem(key);
  if (!savedValue) return fallbackValue;

  return safeParseJson(savedValue, fallbackValue);
};

const writeStorage = (key, value) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(key, JSON.stringify(value));
};

const normalizeFolder = (folder) => {
  const id = folder?.id || folder?.folderId || folder?.name || folder?.folderName;
  const name = folder?.name || folder?.folderName || folder?.title;

  if (!id || !name) return null;

  return {
    id: String(id),
    name: String(name),
    description: String(folder?.description || folder?.desc || ""),
  };
};

export const loadSavedFolders = () => {
  const savedFolders = readStorage(FOLDER_STORAGE_KEY, []);
  const defaultFolderIds = new Set(DEFAULT_FOLDERS.map((folder) => folder.id));

  const customFolders = Array.isArray(savedFolders)
    ? savedFolders
        .map(normalizeFolder)
        .filter(Boolean)
        .filter((folder) => !defaultFolderIds.has(folder.id))
    : [];

  return [...DEFAULT_FOLDERS, ...customFolders];
};

export const savePlaceFolderLink = (placeId, folder) => {
  if (!placeId || !folder) return;

  const savedPlaceFolderMap = readStorage(SAVED_PLACE_FOLDER_STORAGE_KEY, {});

  savedPlaceFolderMap[String(placeId)] = {
    id: folder.id,
    name: folder.name,
    description: folder.description || "",
    savedAt: new Date().toISOString(),
  };

  writeStorage(SAVED_PLACE_FOLDER_STORAGE_KEY, savedPlaceFolderMap);
};

export const removePlaceFolderLink = (placeId) => {
  if (!placeId) return;

  const savedPlaceFolderMap = readStorage(SAVED_PLACE_FOLDER_STORAGE_KEY, {});
  delete savedPlaceFolderMap[String(placeId)];

  writeStorage(SAVED_PLACE_FOLDER_STORAGE_KEY, savedPlaceFolderMap);
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
  defaultSelectedFolderId = "solo",
}) {
  const [folders, setFolders] = useState(DEFAULT_FOLDERS);
  const [selectedFolderId, setSelectedFolderId] = useState(
    defaultSelectedFolderId
  );
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [createFolderError, setCreateFolderError] = useState("");
  const selectedFolderButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const nextFolders = loadSavedFolders();
    const hasDefaultFolder = nextFolders.some(
      (folder) => folder.id === defaultSelectedFolderId
    );

    setFolders(nextFolders);
    setSelectedFolderId(
      hasDefaultFolder
        ? defaultSelectedFolderId
        : nextFolders[0]?.id || DEFAULT_FOLDERS[0].id
    );
    setIsCreateFolderOpen(false);
    setNewFolderName("");
    setNewFolderDescription("");
    setCreateFolderError("");
  }, [defaultSelectedFolderId, open]);

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

  const selectedFolder = useMemo(
    () =>
      folders.find((folder) => folder.id === selectedFolderId) || folders[0],
    [folders, selectedFolderId]
  );

  const resetCreateFolderForm = () => {
    setNewFolderName("");
    setNewFolderDescription("");
    setCreateFolderError("");
  };

  const handleBackdropClick = () => {
    if (isSaving) return;
    onClose?.();
  };

  const handleOpenCreateFolder = () => {
    if (isSaving) return;

    resetCreateFolderForm();
    setIsCreateFolderOpen(true);
  };

  const handleCancelCreateFolder = () => {
    if (isSaving) return;

    resetCreateFolderForm();
    setIsCreateFolderOpen(false);
  };

  const handleCreateFolder = (event) => {
    event.preventDefault();

    if (isSaving) return;

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

    const nextFolder = {
      id: `custom-${Date.now()}`,
      name: trimmedFolderName,
      description: trimmedFolderDescription,
    };

    const nextFolders = [...folders, nextFolder];
    const defaultFolderIds = new Set(DEFAULT_FOLDERS.map((folder) => folder.id));
    const customFolders = nextFolders
      .filter((folder) => !defaultFolderIds.has(folder.id))
      .map(normalizeFolder)
      .filter(Boolean);

    writeStorage(FOLDER_STORAGE_KEY, customFolders);
    setFolders(nextFolders);
    setSelectedFolderId(nextFolder.id);
    resetCreateFolderForm();
    setIsCreateFolderOpen(false);
  };

  const handleSaveClick = () => {
    if (!selectedFolder || isSaving) return;
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
              disabled={isSaving}
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
                />
              </div>
            </div>

            <footer className="folder-create-footer">
              <button
                type="button"
                className="folder-create-cancel-btn"
                onClick={handleCancelCreateFolder}
                disabled={isSaving}
              >
                취소
              </button>

              <button
                type="submit"
                className="folder-create-submit-btn"
                disabled={isSaving || !newFolderName.trim()}
              >
                + 만들기
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
              disabled={isSaving}
              aria-label="폴더 선택 닫기"
            >
              ×
            </button>
          </header>

          <div className="folder-select-body">
            <div className="folder-select-list">
              {folders.map((folder) => {
                const selected = selectedFolderId === folder.id;

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
                  >
                    <span className="folder-select-icon-circle">
                      <FolderIcon />
                    </span>

                    <span className="folder-select-option-name">
                      {folder.name}
                    </span>

                    <span className="folder-select-radio" aria-hidden="true">
                      {selected && <span className="folder-select-radio-dot" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="folder-select-create-btn"
              onClick={handleOpenCreateFolder}
              disabled={isSaving}
            >
              + 새 폴더 만들기
            </button>
          </div>

          <footer className="folder-select-footer">
            <button
              type="button"
              className="folder-select-cancel-btn"
              onClick={onClose}
              disabled={isSaving}
            >
              취소
            </button>

            <button
              type="button"
              className="folder-select-save-btn"
              onClick={handleSaveClick}
              disabled={isSaving}
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
