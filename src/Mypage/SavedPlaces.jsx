import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import "./SavedPlaces.css";

import folderFilledIcon from "../img/파랑색폴더.png";
import editIcon from "../img/연필.png";
import folderAddIcon from "../img/폴더추가.png";
import bluePencilIcon from "../img/파랑연필.png";
import redTrashIcon from "../img/빨강쓰레기.png";
import redWarningIcon from "../img/빨간워닝.png";

import tokyoImg from "../img/도쿄.png";
import kyotoImg from "../img/교토.png";
import beachImg from "../img/서비스 소개 .png";

const FOLDERS_API = "/api/folders";
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

const BackIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      d="M15 6L9 12L15 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MoreVerticalIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <circle cx="12" cy="5" r="1.9" fill="currentColor" />
    <circle cx="12" cy="12" r="1.9" fill="currentColor" />
    <circle cx="12" cy="19" r="1.9" fill="currentColor" />
  </svg>
);

const LocationIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M12 21C12 21 5.5 15.6 5.5 10.4C5.5 6.8 8.4 4 12 4C15.6 4 18.5 6.8 18.5 10.4C18.5 15.6 12 21 12 21Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="10.4"
      r="2.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const StarIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M12 3.8L14.5 8.9L20.1 9.7L16.1 13.7L17 19.3L12 16.7L7 19.3L7.9 13.7L3.9 9.7L9.5 8.9L12 3.8Z"
      fill="#FDBA1C"
      stroke="#FDBA1C"
      strokeLinejoin="round"
    />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="9"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M12 8V16M8 12H16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
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

const SortTabButtons = ({ activeSort, onChange }) => (
  <section className="saved-sort-tabs">
    {sortTabs.map((sortName) => (
      <button
        key={sortName}
        type="button"
        className={`saved-sort-tab ${activeSort === sortName ? "active" : ""}`}
        onClick={() => onChange(sortName)}
      >
        {sortName}
      </button>
    ))}
  </section>
);

const getArrayData = (data) => {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.folders)) return data.folders;
  if (Array.isArray(data?.places)) return data.places;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.results)) return data.results;

  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.folders)) return data.data.folders;
  if (Array.isArray(data?.data?.places)) return data.data.places;
  if (Array.isArray(data?.result?.content)) return data.result.content;

  return [];
};

const getTextValue = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;

    const text = String(value).trim();

    if (text) return text;
  }

  return "";
};

const getNumberValue = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;

    const numberValue = Number(value);

    if (Number.isFinite(numberValue)) return numberValue;
  }

  return null;
};

const getFolderPlacesUrl = (folderId) => {
  return `${FOLDERS_API}/${encodeURIComponent(folderId)}/places`;
};

const getFolderPlaceDeleteUrl = (folderId, placeId) => {
  return `${FOLDERS_API}/${encodeURIComponent(
    folderId
  )}/places/${encodeURIComponent(placeId)}`;
};

const getPlaceImage = (place = {}, index = 0) => {
  const image = getTextValue(
    place.image,
    place.imageUrl,
    place.thumbnail,
    place.thumbnailUrl,
    place.photoUrl
  );

  if (image) return image;

  const text = [
    place.placeName,
    place.name,
    place.title,
    place.address,
    place.placeType,
  ]
    .filter(Boolean)
    .join(" ");

  if (/숲|산림|비자림|사려니|forest|교토|kyoto/i.test(text)) {
    return kyotoImg;
  }

  if (/제주|해수욕장|해변|바다|오션|발리|다낭|beach|bali|danang/i.test(text)) {
    return beachImg;
  }

  const fallbackImages = [beachImg, kyotoImg, tokyoImg];
  return fallbackImages[index % fallbackImages.length];
};

const normalizeFolder = (folder = {}, index = 0) => {
  const id = folder.id ?? folder.folderId ?? `folder-${index}`;
  const name =
    getTextValue(folder.name, folder.folderName, folder.title) ||
    "이름 없는 폴더";

  return {
    ...folder,
    id,
    name,
    title: name,
    description: getTextValue(folder.description, folder.memo) || "나만의 여행 폴더",
    count: Number(folder.count || folder.placeCount || 0),
    icon: folderFilledIcon,
    createdAt: folder.createdAt || folder.createdDate || "",
  };
};

const normalizeFolderPlace = (place = {}, index = 0) => {
  const id = place.id ?? place.placeId ?? `folder-place-${index}`;

  const title =
    getTextValue(place.placeName, place.name, place.title) || "이름 없는 장소";

  const address =
    getTextValue(place.address, place.location, place.roadAddress, place.region) ||
    "위치 정보 없음";

  const placeType =
    getTextValue(place.placeType, place.theme, place.category, place.categoryName) ||
    "저장 장소";

  const rating =
    getNumberValue(place.rating, place.score, place.reviewScore, 4.8) ?? 4.8;

  const latitude = getNumberValue(place.latitude, place.lat, place.y);
  const longitude = getNumberValue(place.longitude, place.lng, place.lon, place.x);

  return {
    ...place,
    id,
    placeId: place.placeId ?? place.id ?? id,
    title,
    name: title,
    placeName: title,
    address,
    placeType,
    rating: rating % 1 === 0 ? rating.toFixed(1) : String(rating),
    image: getPlaceImage({ ...place, title, address }, index),
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
  };
};

const sortByTab = (items = [], activeSort, getName) => {
  const copiedItems = [...items];

  if (activeSort === "최신순") {
    return copiedItems.reverse();
  }

  if (activeSort === "이름순") {
    return copiedItems.sort((a, b) => getName(a).localeCompare(getName(b), "ko"));
  }

  return copiedItems;
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
      if (event.key === "Escape") onClose();
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
      if (event.key === "Escape") onClose();
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
      if (event.key === "Escape") onClose();
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const folderIdFromUrl = searchParams.get("folderId");

  const [activeSort, setActiveSort] = useState("전체보기");
  const [modalType, setModalType] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folders, setFolders] = useState([]);
  const [openedFolder, setOpenedFolder] = useState(null);
  const [openedFolderPlaces, setOpenedFolderPlaces] = useState([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renameDescription, setRenameDescription] = useState("");

  const loadFolderPlaces = useCallback(async (folderId) => {
    const response = await api.get(getFolderPlacesUrl(folderId));

    return getArrayData(response.data).map((place, index) =>
      normalizeFolderPlace(place, index)
    );
  }, []);

  const loadFolders = useCallback(async () => {
    try {
      setIsLoadingFolders(true);

      const response = await api.get(FOLDERS_API);
      const nextFolders = getArrayData(response.data).map((folder, index) =>
        normalizeFolder(folder, index)
      );

      const countEntries = await Promise.all(
        nextFolders.map(async (folder) => {
          try {
            const places = await loadFolderPlaces(folder.id);
            return [String(folder.id), places.length];
          } catch (error) {
            console.error(`${folder.title} 장소 개수 조회 실패:`, error);
            return [String(folder.id), 0];
          }
        })
      );

      const countMap = Object.fromEntries(countEntries);

      setFolders(
        nextFolders.map((folder) => ({
          ...folder,
          count: countMap[String(folder.id)] ?? 0,
        }))
      );
    } catch (error) {
      console.error("폴더 목록 조회 실패:", error);
      setFolders([]);
    } finally {
      setIsLoadingFolders(false);
    }
  }, [loadFolderPlaces]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const totalSavedCount = useMemo(() => {
    return folders.reduce((sum, folder) => sum + Number(folder.count || 0), 0);
  }, [folders]);

  const sortedFolders = useMemo(() => {
    return sortByTab(folders, activeSort, (folder) => folder.title);
  }, [activeSort, folders]);

  const sortedOpenedFolderPlaces = useMemo(() => {
    return sortByTab(openedFolderPlaces, activeSort, (place) => place.title);
  }, [activeSort, openedFolderPlaces]);

  const openFolder = useCallback(
    async (folder, shouldUpdateUrl = true) => {
      if (!folder?.id) return;

      try {
        setOpenedFolder(folder);
        setIsLoadingPlaces(true);
        setActiveSort("전체보기");

        if (shouldUpdateUrl) {
          setSearchParams({ folderId: String(folder.id) });
        }

        const places = await loadFolderPlaces(folder.id);
        setOpenedFolderPlaces(places);
      } catch (error) {
        console.error("폴더 장소 조회 실패:", error);
        setOpenedFolderPlaces([]);
      } finally {
        setIsLoadingPlaces(false);
      }
    },
    [loadFolderPlaces, setSearchParams]
  );

  useEffect(() => {
    if (!folderIdFromUrl || folders.length === 0 || openedFolder) return;

    const matchedFolder = folders.find(
      (folder) => String(folder.id) === String(folderIdFromUrl)
    );

    if (matchedFolder) {
      openFolder(matchedFolder, false);
    }
  }, [folderIdFromUrl, folders, openedFolder, openFolder]);

  const handleCloseFolder = () => {
    setOpenedFolder(null);
    setOpenedFolderPlaces([]);
    setActiveSort("전체보기");
    setSearchParams({});
  };

  const handleEditClick = (event, folder) => {
    event.preventDefault();
    event.stopPropagation();

    setSelectedFolder(folder);
    setModalType("manage");
  };

  const handleArrowClick = (event, folder) => {
    event.preventDefault();
    event.stopPropagation();

    openFolder(folder);
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
    alert("현재 백엔드에 폴더 이름 변경 API가 없습니다.");
    handleCloseModal();
  };

  const handleDeleteSubmit = () => {
    alert("현재 백엔드에 폴더 삭제 API가 없습니다.");
    handleCloseModal();
  };

  const handleAddFolderClick = async () => {
    const defaultName = `새 폴더 ${folders.length + 1}`;
    const folderName = window.prompt("새 폴더 이름을 입력해주세요.", defaultName);

    if (folderName === null) return;

    const trimmedName = folderName.trim();

    if (!trimmedName) {
      alert("폴더 이름을 입력해주세요.");
      return;
    }

    try {
      await api.post(FOLDERS_API, {
        name: trimmedName,
      });

      await loadFolders();
    } catch (error) {
      console.error("새 폴더 생성 실패:", error);
      alert("새 폴더 생성에 실패했습니다.");
    }
  };

  const handlePlaceClick = (place) => {
    navigate(`/detail?id=${encodeURIComponent(place.placeId || place.id)}`, {
      state: { place },
    });
  };

  const handleViewPlaceClick = (event, place) => {
    event.stopPropagation();
    handlePlaceClick(place);
  };

  const handlePlaceMoreClick = async (event, place) => {
    event.stopPropagation();

    if (!openedFolder?.id || !place?.placeId) return;

    const isConfirmed = window.confirm("이 폴더에서 해당 장소를 삭제할까요?");

    if (!isConfirmed) return;

    try {
      await api.delete(getFolderPlaceDeleteUrl(openedFolder.id, place.placeId));

      const nextPlaces = await loadFolderPlaces(openedFolder.id);
      setOpenedFolderPlaces(nextPlaces);

      await loadFolders();
    } catch (error) {
      console.error("폴더 장소 삭제 실패:", error);
      alert("폴더에서 장소를 삭제하지 못했습니다.");
    }
  };

  const handleDiscoverPlacesClick = () => {
    if (!openedFolder?.id) return;

    navigate(`/search?folderId=${encodeURIComponent(openedFolder.id)}`);
  };

  return (
    <main className="saved-places-page">
      {openedFolder ? (
        <>
          <section className="saved-folder-detail-header">
            <button
              type="button"
              className="saved-folder-back-button"
              onClick={handleCloseFolder}
            >
              <BackIcon />
              <span>폴더 목록</span>
            </button>

            <div>
              <h1>{openedFolder.title}</h1>
              <p>{openedFolderPlaces.length}개의 장소</p>
            </div>
          </section>

          <SortTabButtons activeSort={activeSort} onChange={setActiveSort} />

          <section className="saved-place-list">
            {isLoadingPlaces ? (
              <p className="saved-place-empty-text">장소를 불러오는 중입니다...</p>
            ) : (
              sortedOpenedFolderPlaces.map((place) => (
                <article
                  key={place.id}
                  className="saved-place-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => handlePlaceClick(place)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handlePlaceClick(place);
                    }
                  }}
                >
                  <img
                    src={place.image}
                    alt={place.title}
                    className="saved-place-image"
                  />

                  <div className="saved-place-body">
                    <span className="saved-place-type">{place.placeType}</span>

                    <h2>{place.title}</h2>

                    <div className="saved-place-meta">
                      <span className="saved-place-location">
                        <LocationIcon />
                        {place.address}
                      </span>

                      <span className="saved-place-dot">•</span>

                      <span className="saved-place-rating">
                        <StarIcon />
                        {place.rating}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="saved-place-schedule-button"
                      onClick={(event) => handleViewPlaceClick(event, place)}
                    >
                      <PlusIcon />
                      장소 보기
                    </button>
                  </div>

                  <button
                    type="button"
                    className="saved-place-more-button"
                    onClick={(event) => handlePlaceMoreClick(event, place)}
                    aria-label="장소 삭제"
                  >
                    <MoreVerticalIcon />
                  </button>
                </article>
              ))
            )}

            {!isLoadingPlaces && sortedOpenedFolderPlaces.length === 0 && (
              <p className="saved-place-empty-text">
                이 폴더에 저장된 장소가 없습니다.
              </p>
            )}

            <button
              type="button"
              className="saved-add-place-card"
              onClick={handleDiscoverPlacesClick}
            >
              <span className="saved-add-place-plus">+</span>
              <strong>이 폴더에 새 장소 추가</strong>
              <span>DISCOVER NEW PLACES</span>
            </button>
          </section>
        </>
      ) : (
        <>
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

          <SortTabButtons activeSort={activeSort} onChange={setActiveSort} />

          <section className="saved-folder-list">
            {isLoadingFolders ? (
              <p className="saved-place-empty-text">폴더를 불러오는 중입니다...</p>
            ) : (
              sortedFolders.map((folder) => (
                <article
                  key={folder.id}
                  className="saved-folder-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => openFolder(folder)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openFolder(folder);
                    }
                  }}
                >
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
              ))
            )}

            {!isLoadingFolders && sortedFolders.length === 0 && (
              <p className="saved-place-empty-text">아직 생성된 폴더가 없습니다.</p>
            )}

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
        </>
      )}

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