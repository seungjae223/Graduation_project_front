
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import "./SavedPlaces.css";
import useReadQuery from "../utils/useReadQuery"; import { requireList } from "../api/responseContract"; import PlacePhoto from "../components/PlacePhoto"; import { getPlaceTypeLabel } from "../utils/placeType"; import { useSavedPlaces } from "../Context/SavedPlacesContext"; import { readSavedFolderSnapshot } from "../utils/useFolderSavedPlaces";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import InputDialog from "../components/InputDialog";
import useMutationTask from "../utils/useMutationTask";

import folderFilledIcon from "../img/파랑색폴더.png";
import folderAddIcon from "../img/폴더추가.png";


const FOLDERS_API = "/api/folders";
const EMPTY_ITEMS = [];
const sortTabs = ["전체보기", "최신순", "이름순"];

const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      d="M9 6L15 12L9 18"
      fill="none"
      stroke="currentColor"
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

const SortTabButtons = ({ activeSort, onChange }) => (
  <section className="saved-sort-tabs">
    {sortTabs.map((sortName) => (
      <button
        key={sortName}
        type="button"
        className={`saved-sort-tab ${activeSort === sortName ? "active" : ""}`}
        aria-pressed={activeSort === sortName} disabled={sortName === "최신순"} title={sortName === "최신순" ? "저장 시각이 제공되지 않아 최신순을 확인할 수 없습니다." : undefined} onClick={() => onChange(sortName)}
      >
        {sortName}
      </button>
    ))}
  </section>
);

const getArrayData = requireList;

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

const getPlaceImage = (place = {}) => getTextValue(place.image, place.imageUrl, place.thumbnail, place.thumbnailUrl, place.photoUrl);

const normalizeFolder = (folder = {}, index = 0) => {
  const id = folder.id ?? folder.folderId;
  if (id === null || id === undefined || !String(id).trim()) throw new Error("폴더 식별자 확인 실패");
  const name =
    getTextValue(folder.name, folder.folderName, folder.title) ||
    "이름 없는 폴더";

  return {
    ...folder,
    id,
    name,
    title: name,
    description: getTextValue(folder.description, folder.memo) || "나만의 여행 폴더",
    count: getNumberValue(folder.count, folder.placeCount),
    icon: folderFilledIcon,
    createdAt: folder.createdAt || folder.createdDate || "",
  };
};

const normalizeFolderPlace = (record = {}, index = 0) => {
  const place = record.place ? { ...record.place, placeId: record.placeId ?? record.place.id } : record;
  const id = place.placeId ?? place.id;
  if (id === null || id === undefined || !String(id).trim()) throw new Error("장소 식별자 확인 실패");

  const title =
    getTextValue(place.placeName, place.name, place.title) || "이름 없는 장소";

  const address =
    getTextValue(place.address, place.location, place.roadAddress, place.region) ||
    "위치 정보 없음";

  const placeType =
    getTextValue(place.placeType, place.theme, place.category, place.categoryName) ||
    "저장 장소";

  const rating =
    getNumberValue(place.rating, place.score, place.reviewScore);

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
    rating: rating === null ? null : rating % 1 === 0 ? rating.toFixed(1) : String(rating),
    placeTypeLabel: getPlaceTypeLabel(placeType),
    image: getPlaceImage({ ...place, title, address }, index),
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
  };
};

const sortByTab = (items = [], activeSort, getName) => {
  const copiedItems = [...items];



  if (activeSort === "이름순") {
    return copiedItems.sort((a, b) => getName(a).localeCompare(getName(b), "ko"));
  }

  return copiedItems;
};

function SavedPlacesContent() {
  const navigate = useNavigate();
  const account = useSessionKey();
  const currentAccount = useRef(account); currentAccount.current = account;
  const [searchParams, setSearchParams] = useSearchParams();
  const folderIdFromUrl = searchParams.get("folderId");

  const [activeSort, setActiveSort] = useState("전체보기");
  const { syncSavedPlaces } = useSavedPlaces();
  const counts = useRef({ account, folders: [] });
  if (counts.current.account !== account) counts.current = { account, folders: [] };
  const foldersQuery = useReadQuery(account + ":folder-list", async signal => {
    const rows = getArrayData((await api.get(FOLDERS_API, { signal })).data).map(normalizeFolder);
    const results = await Promise.allSettled(rows.map(async folder => {
      if (folder.count !== null) return folder.count;
      return getArrayData((await api.get(getFolderPlacesUrl(folder.id), { signal })).data).length;
    }));
    if (signal.aborted) throw new DOMException("취소됨", "AbortError");
    return rows.map((folder, index) => ({ ...folder, count: results[index].status === "fulfilled" ? results[index].value : counts.current.folders.find(old => String(old.id) === String(folder.id))?.count ?? null, countUnknown: results[index].status === "rejected" }));
  }, account !== "anonymous", () => getAuthSnapshot().accountKey === account);
  const folders = foldersQuery.data || EMPTY_ITEMS;
  useEffect(() => { if (foldersQuery.data) counts.current = { account, folders: foldersQuery.data }; }, [account, foldersQuery.data]);
  const openedFolder = folders.find(folder => String(folder.id) === String(folderIdFromUrl)) || null;
  const placesQuery = useReadQuery(account + ":folder-places:" + folderIdFromUrl, async signal => getArrayData((await api.get(getFolderPlacesUrl(folderIdFromUrl), { signal })).data).map(normalizeFolderPlace), Boolean(folderIdFromUrl) && account !== "anonymous", () => getAuthSnapshot().accountKey === account);
  const openedFolderPlaces = placesQuery.data || EMPTY_ITEMS;
  const isLoadingFolders = foldersQuery.status === "loading" && !foldersQuery.data;
  const isLoadingPlaces = placesQuery.status === "loading" && !placesQuery.data;
  const [createOpen, setCreateOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [validation, setValidation] = useState("");
  const createTask = useMutationTask(account + ":create-folder");
  const removeTask = useMutationTask(account + ":remove:" + folderIdFromUrl);
  const currentFolder = useRef(folderIdFromUrl); currentFolder.current = folderIdFromUrl;
  const loadFolders = async () => { const next = await foldersQuery.read(); if (!next) throw new Error("폴더 목록 확인 실패"); return next; };
  const totalSavedCount = foldersQuery.data && folders.every(folder => folder.count !== null && !folder.countUnknown) ? folders.reduce((sum, folder) => sum + folder.count, 0) : null;
  const sortedFolders = useMemo(() => sortByTab(folders, activeSort, folder => folder.title), [folders, activeSort]);
  const sortedOpenedFolderPlaces = useMemo(() => sortByTab(openedFolderPlaces, activeSort, place => place.title), [openedFolderPlaces, activeSort]);
  const openFolder = folder => { if (folder?.id) { setActiveSort("전체보기"); setSearchParams({ folderId: String(folder.id) }); } };
  const handleCloseFolder = () => { setActiveSort("전체보기"); setSearchParams({}); };
  const handleArrowClick = (event, folder) => { event.preventDefault(); event.stopPropagation(); openFolder(folder); };

  const handleAddFolderClick = () => { createTask.reset(); setValidation(""); setCreateOpen(true); };
  const submitFolder = async () => {
    if (createTask.blocked || createTask.status === "success") return;
    const name = folderName.trim();
    if (!name || name.length > 255) { setValidation("폴더명은 공백만 입력할 수 없으며 1~255자로 입력해주세요."); return; }
    setValidation("");
    await createTask.run(() => api.post(FOLDERS_API, { name }), loadFolders, {
      failure: "폴더 생성에 실패했어요. 입력한 이름은 유지됩니다.",
      success: "폴더가 생성됐어요. 취소 버튼으로 닫을 수 있습니다.",
      refreshFailure: "폴더는 생성됐지만 목록을 새로 불러오지 못했어요.",
    });
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

    if (removeTask.blocked || !openedFolder?.id || !place?.placeId) return;

    const isConfirmed = window.confirm("이 폴더에서 해당 장소를 삭제할까요?");

    if (!isConfirmed) return;

    const folderId = openedFolder.id;
    const placeId = place.placeId;
    await removeTask.run(() => api.delete(getFolderPlaceDeleteUrl(folderId, placeId)), async () => {
      const places = await placesQuery.read();
      if (!Array.isArray(places) || currentAccount.current !== account || String(currentFolder.current) !== String(folderId)) throw new Error("장소 목록 확인 실패");
      await loadFolders();
      const snapshot = await readSavedFolderSnapshot();
      if (getAuthSnapshot().accountKey !== account) throw new Error("계정 변경");
      syncSavedPlaces?.(snapshot.places, snapshot.complete);
      return { confirmed: !places.some(item => String(item.placeId) === String(placeId)) };
    }, {
      failure: "이 폴더에서 장소를 제거하지 못했어요.",
      success: "이 폴더에서 장소를 제거했어요.",
      refreshFailure: "장소는 제거됐지만 최신 목록을 불러오지 못했어요.",
    });
  };
  const handleDiscoverPlacesClick = () => {
    if (!openedFolder?.id) return;

    navigate(`/search?folderId=${encodeURIComponent(openedFolder.id)}`);
  };

  return (
    <main className="saved-places-page">
      <InputDialog open={createOpen} title="새 폴더 만들기" label="폴더명" value={folderName} maxLength={255}
        onChange={setFolderName} onClose={() => setCreateOpen(false)} onSubmit={submitFolder}
        busy={createTask.status === "running"} blocked={createTask.blocked || createTask.status === "success"} message={validation || createTask.message}
        onRetry={["refreshError", "unknown"].includes(createTask.status) ? createTask.retryRead : null} />
      {foldersQuery.status === "error" && <section role="alert"><p>폴더 목록을 불러오지 못했어요.</p><button type="button" onClick={foldersQuery.retry}>폴더 목록 다시 불러오기</button></section>}
      {folders.some(folder => folder.countUnknown) && <section role="status"><p>일부 폴더의 장소 개수를 확인하지 못했어요.</p><button type="button" onClick={foldersQuery.retry}>장소 개수 다시 확인</button></section>}
      {folderIdFromUrl && placesQuery.status === "error" && <section role="alert"><p>이 폴더의 장소 목록을 불러오지 못했어요.</p><button type="button" onClick={placesQuery.retry}>장소 목록 다시 불러오기</button></section>}
      {removeTask.message && <section role="status"><p>{removeTask.message}</p>
        {["refreshError", "unknown"].includes(removeTask.status) && <button type="button" onClick={removeTask.retryRead}>최신 목록 다시 확인</button>}
      </section>}
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
              <p>{placesQuery.data ? `${openedFolderPlaces.length}개의 장소` : "장소 개수 미확인"}</p>
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
                    if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      handlePlaceClick(place);
                    }
                  }}
                >
                  <PlacePhoto src={place.image} alt={place.title} className="saved-place-image" />

                  <div className="saved-place-body">
                    <span className="saved-place-type">{place.placeTypeLabel}</span>

                    <h2>{place.title}</h2>

                    <div className="saved-place-meta">
                      <span className="saved-place-location">
                        <LocationIcon />
                        {place.address}
                      </span>

                      {place.rating !== null && <span className="saved-place-dot">•</span>}

                      {place.rating !== null && <span className="saved-place-rating">
                        <StarIcon />
                        {place.rating}
                      </span>}
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
                    disabled={removeTask.blocked}
onClick={(event) => handlePlaceMoreClick(event, place)}
                    aria-label="장소 삭제"
                  >
                    <MoreVerticalIcon />
                  </button>
                </article>
              ))
            )}

            {!isLoadingPlaces && placesQuery.status === "success" && sortedOpenedFolderPlaces.length === 0 && (
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
              <p>{totalSavedCount === null ? "저장한 장소 개수 미확인" : `총 ${totalSavedCount}개의 장소를 저장했습니다`}</p>
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
                      <span>{folder.countUnknown || folder.count === null ? "개수 미확인" : `${folder.count} 장소`}</span>
                      <span className="saved-folder-dot">•</span>
                      <span>{folder.description}</span>
                    </p>
                  </div>

                  <div className="saved-folder-actions">
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

            {!isLoadingFolders && foldersQuery.status === "success" && sortedFolders.length === 0 && (
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

    </main>
  );
}

export default function SavedPlaces() {
  const account = useSessionKey();
  return <SavedPlacesContent key={account} />;
}
