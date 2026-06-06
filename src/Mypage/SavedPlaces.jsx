import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSavedPlaces } from "../Context/SavedPlacesContext";
import "./SavedPlaces.css";

import folderOutlineIcon from "../img/파랑색 테두리 폴더.png";
import folderFilledIcon from "../img/파랑색폴더.png";
import editIcon from "../img/연필.png";
import folderAddIcon from "../img/폴더추가.png";
import bluePencilIcon from "../img/파랑연필.png";
import redTrashIcon from "../img/빨강쓰레기.png";
import redWarningIcon from "../img/빨간워닝.png";

const sortTabs = ["전체보기", "최신순", "이름순"];

const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      d="M9 6L15 12L9 18"
      fill="none"
      stroke="#B9C2D0"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const useBodyScrollLock = (isLocked) => {
  useEffect(() => {
    if (!isLocked) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isLocked]);
};

const FolderManageModal = ({
  isOpen,
  folder,
  onClose,
  onOpenRename,
  onOpenDelete,
}) => {
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="folder-modal-backdrop" onClick={onClose}>
      <div
        className="folder-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="folder-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="folder-modal-header">
          <h2 id="folder-modal-title">폴더 관리</h2>
        </div>

        <div className="folder-modal-body">
          <button
            type="button"
            className="folder-modal-menu-item"
            onClick={() => onOpenRename(folder)}
          >
            <span className="folder-modal-icon-circle blue">
              <img src={bluePencilIcon} alt="" />
            </span>

            <span className="folder-modal-menu-text">폴더 이름 변경</span>

            <span className="folder-modal-arrow">
              <ArrowRightIcon />
            </span>
          </button>

          <div className="folder-modal-divider" />

          <button
            type="button"
            className="folder-modal-menu-item delete"
            onClick={() => onOpenDelete(folder)}
          >
            <span className="folder-modal-icon-circle red">
              <img src={redTrashIcon} alt="" />
            </span>

            <span className="folder-modal-menu-text">폴더 삭제</span>

            <span className="folder-modal-arrow">
              <ArrowRightIcon />
            </span>
          </button>
        </div>

        <div className="folder-modal-footer">
          <button
            type="button"
            className="folder-modal-cancel"
            onClick={onClose}
          >
            취소
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const FolderRenameModal = ({
  isOpen,
  folderName,
  folderDescription,
  onChangeName,
  onChangeDescription,
  onClose,
  onSubmit,
}) => {
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="folder-modal-backdrop" onClick={onClose}>
      <div
        className="folder-rename-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="folder-rename-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="folder-rename-title">폴더 이름 변경</h2>

        <div className="folder-rename-form">
          <label>
            <span>폴더명</span>
            <input
              type="text"
              value={folderName}
              onChange={(event) => onChangeName(event.target.value)}
            />
          </label>

          <label>
            <span>설명</span>
            <input
              type="text"
              value={folderDescription}
              onChange={(event) => onChangeDescription(event.target.value)}
            />
          </label>
        </div>

        <div className="folder-rename-actions">
          <button
            type="button"
            className="folder-rename-cancel"
            onClick={onClose}
          >
            취소
          </button>

          <button
            type="button"
            className="folder-rename-submit"
            onClick={onSubmit}
          >
            변경하기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const FolderDeleteModal = ({ isOpen, onClose, onSubmit }) => {
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="folder-modal-backdrop" onClick={onClose}>
      <div
        className="folder-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="folder-delete-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="folder-delete-top">
          <div className="folder-delete-warning-circle">
            <img src={redWarningIcon} alt="" />
          </div>
        </div>

        <div className="folder-delete-content">
          <h2 id="folder-delete-title">폴더를 삭제하시겠습니까?</h2>
          <p>
            폴더를 삭제하면 그 안에 저장된 모든 장소 목록이 함께 사라집니다.
            이 작업은 되돌릴 수 없습니다.
          </p>

          <div className="folder-delete-actions">
            <button
              type="button"
              className="folder-delete-cancel"
              onClick={onClose}
            >
              취소
            </button>

            <button
              type="button"
              className="folder-delete-submit"
              onClick={onSubmit}
            >
              삭제하기
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

function SavedPlaces() {
  const { savedPlaces } = useSavedPlaces();

  const [activeSort, setActiveSort] = useState("전체보기");
  const [modalType, setModalType] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [customFolders, setCustomFolders] = useState(null);
  const [renameName, setRenameName] = useState("");
  const [renameDescription, setRenameDescription] = useState("");

  const totalSavedCount = savedPlaces.length > 0 ? savedPlaces.length : 12;

  // ✅ [수정 완료] 처음에는 "전체 저장됨" 폴더 하나만 나오도록 변경했습니다.
  const baseFolders = useMemo(
    () => [
      {
        id: 1,
        title: "전체 저장됨",
        count: totalSavedCount,
        description: "모든 여행지 모아보기",
        icon: folderFilledIcon,
      },
    ],
    [totalSavedCount]
  );

  const folderData = useMemo(() => {
    if (!customFolders) return baseFolders;

    return customFolders.map((folder) =>
      folder.id === 1 ? { ...folder, count: totalSavedCount } : folder
    );
  }, [baseFolders, customFolders, totalSavedCount]);

  const sortedFolders = useMemo(() => {
    const copiedFolders = [...folderData];

    if (activeSort === "최신순") {
      return copiedFolders.reverse();
    }

    if (activeSort === "이름순") {
      return copiedFolders.sort((a, b) => a.title.localeCompare(b.title, "ko"));
    }

    return copiedFolders;
  }, [activeSort, folderData]);

  const handleEditClick = (event, folder) => {
    event.preventDefault();
    event.stopPropagation();

    setSelectedFolder(folder);
    setModalType("manage");
  };

  const handleArrowClick = (event, folder) => {
    event.preventDefault();
    event.stopPropagation();

    console.log("폴더 열기:", folder);
  };

  const handleCloseModal = () => {
    setModalType(null);
    setSelectedFolder(null);
    setRenameName("");
    setRenameDescription("");
  };

  const handleOpenRenameModal = (folder) => {
    setSelectedFolder(folder);
    setRenameName(folder?.title || "");
    setRenameDescription(folder?.description || "");
    setModalType("rename");
  };

  const handleOpenDeleteModal = (folder) => {
    setSelectedFolder(folder);
    setModalType("delete");
  };

  const handleRenameSubmit = () => {
    if (!selectedFolder) return;

    const nextName = renameName.trim();
    const nextDescription = renameDescription.trim();

    if (!nextName) {
      return;
    }

    setCustomFolders((prev) => {
      const sourceFolders = prev || baseFolders;

      return sourceFolders.map((folder) =>
        folder.id === selectedFolder.id
          ? {
              ...folder,
              title: nextName,
              description: nextDescription || folder.description,
            }
          : folder
      );
    });

    handleCloseModal();
  };

  const handleDeleteSubmit = () => {
    if (!selectedFolder) return;

    setCustomFolders((prev) => {
      const sourceFolders = prev || baseFolders;
      return sourceFolders.filter((folder) => folder.id !== selectedFolder.id);
    });

    handleCloseModal();
  };

  const handleAddFolderClick = () => {
    console.log("새 폴더 추가");
  };

  return (
    <main className="saved-places-page">
      <section className="saved-places-header">
        <div className="saved-places-title-box">
          <h1>나만의 컬렉션</h1>
          <p>총 {totalSavedCount}개의 장소를 저장했습니다</p>
        </div>

        <button
          type="button"
          className="saved-add-folder-button"
          onClick={handleAddFolderClick}
        >
          <img src={folderAddIcon} alt="" />
          <span>새 폴더 추가</span>
        </button>
      </section>

      <section className="saved-sort-tabs">
        {sortTabs.map((sortName) => (
          <button
            key={sortName}
            type="button"
            className={`saved-sort-tab ${
              activeSort === sortName ? "active" : ""
            }`}
            onClick={() => setActiveSort(sortName)}
          >
            {sortName}
          </button>
        ))}
      </section>

      <section className="saved-folder-list">
        {sortedFolders.map((folder) => (
          <article key={folder.id} className="saved-folder-card">
            <div className="saved-folder-icon-circle">
              <img src={folder.icon} alt="" className="saved-folder-icon" />
            </div>

            <div className="saved-folder-info">
              <h2>{folder.title}</h2>

              <p>
                <span>{folder.count} 장소</span>
                <span className="saved-folder-dot">•</span>
                <span>{folder.description}</span>
              </p>
            </div>

            <div className="saved-folder-actions">
              <button
                type="button"
                className="saved-folder-action-button saved-folder-edit-button"
                onClick={(event) => handleEditClick(event, folder)}
                aria-label="폴더 관리 열기"
              >
                <img src={editIcon} alt="" />
              </button>

              <button
                type="button"
                className="saved-folder-action-button"
                onClick={(event) => handleArrowClick(event, folder)}
                aria-label="폴더 열기"
              >
                <ArrowRightIcon />
              </button>
            </div>
          </article>
        ))}

        <button
          type="button"
          className="saved-create-folder-card"
          onClick={handleAddFolderClick}
        >
          <div className="saved-folder-icon-circle">
            <img src={folderAddIcon} alt="" className="saved-folder-icon" />
          </div>

          <div className="saved-folder-info">
            <h2>새 폴더 만들기</h2>
            <p>나만의 여행 테마를 만들어보세요</p>
          </div>
        </button>
      </section>

      <FolderManageModal
        isOpen={modalType === "manage"}
        folder={selectedFolder}
        onClose={handleCloseModal}
        onOpenRename={handleOpenRenameModal}
        onOpenDelete={handleOpenDeleteModal}
      />

      <FolderRenameModal
        isOpen={modalType === "rename"}
        folderName={renameName}
        folderDescription={renameDescription}
        onChangeName={setRenameName}
        onChangeDescription={setRenameDescription}
        onClose={handleCloseModal}
        onSubmit={handleRenameSubmit}
      />

      <FolderDeleteModal
        isOpen={modalType === "delete"}
        onClose={handleCloseModal}
        onSubmit={handleDeleteSubmit}
      />
    </main>
  );
}

export default SavedPlaces;