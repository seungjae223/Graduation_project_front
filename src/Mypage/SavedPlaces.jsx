
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import "./SavedPlaces.css";
import useReadQuery from "../utils/useReadQuery"; import { requireList } from "../api/responseContract"; import { useSavedPlaces } from "../Context/SavedPlacesContext"; import { readSavedFolderSnapshot } from "../utils/useFolderSavedPlaces";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import InputDialog from "../components/InputDialog";
import useMutationTask from "../utils/useMutationTask";
import usePlaceSaving from "../utils/usePlaceSaving";
import PlaceSavingFeedback, { PlaceSaveModal } from "../components/PlaceSavingFeedback";
import PlaceExploreCard from "../components/PlaceExploreCard";
import PlacePhoto from "../components/PlacePhoto";
import { getPlacePhoto } from "../data/placePhotos";
import { getPlaceEngagementApi } from "../api/placeEngagementApi";
import { getPlaceCategoryLabel } from "../utils/placeCategory";

import folderFilledIcon from "../img/파랑색폴더.png";


const FOLDERS_API = "/api/folders";
const EMPTY_ITEMS = [];
const SORT_ORDER = ["기본순", "좋아요순", "리뷰순"];
const CATEGORIES = ["LANDMARK","CULTURE","NATURE","FOOD","SHOPPING","EXPERIENCE","STAY"];
function HeartFolderIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.8 4.8a5.3 5.3 0 0 0-7.5 0L12 6.1l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.7a5.3 5.3 0 0 0 0-7.5Z" />
  </svg>;
}
function TrashIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />
  </svg>;
}
function SortIcon({ sort }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {sort === "기본순" && <path d="M4 6h16M4 12h12M4 18h8" />}
    {sort === "좋아요순" && <path d="M20.8 4.8a5.3 5.3 0 0 0-7.5 0L12 6.1l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.7a5.3 5.3 0 0 0 0-7.5Z" />}
    {sort === "리뷰순" && <path d="M20 11.5a8 8 0 0 1-8 8 9 9 0 0 1-3-.5L4 21l1.5-4.5a8 8 0 1 1 14.5-5Z" />}
  </svg>;
}

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

  const placeCategory = getTextValue(place.placeCategory);
  const placeCategoryLabel =
    getTextValue(place.placeCategoryLabel) || "장소";

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
    placeCategory,
    placeCategoryLabel,
    rating: rating === null ? null : rating % 1 === 0 ? rating.toFixed(1) : String(rating),
    image: getPlaceImage({ ...place, title, address }, index),
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
  };
};


function SavedPlacesContent() {
  const navigate = useNavigate();
  const account = useSessionKey();
  const currentAccount = useRef(account); currentAccount.current = account;
  const [searchParams, setSearchParams] = useSearchParams();
  const folderIdFromUrl = searchParams.get("folderId");
  // Keep entry direction stable through async folder reads; no animation on first deep link.
  const folderMotion = useRef({ id: folderIdFromUrl, direction: "neutral" });
  if (folderMotion.current.id !== folderIdFromUrl) {
    folderMotion.current = { id: folderIdFromUrl,
      direction: folderIdFromUrl ? "forward" : "backward" };
  }
  const folderDirection = folderMotion.current.direction;

  const [activeSort, setActiveSort] = useState("기본순");
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("ALL");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [folderSelectionMode, setFolderSelectionMode] = useState(false);
  const [folderSelectedIds, setFolderSelectedIds] = useState([]);
  const saving = usePlaceSaving();
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
  const deleteFolderTask = useMutationTask(account + ":delete-folder");
  const renameTask = useMutationTask(account + ":rename-folder");
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameName, setRenameName] = useState("");
  const [renameValidation, setRenameValidation] = useState("");
  const bulkTask = useMutationTask(account + ":bulk-remove:" + folderIdFromUrl);
  const currentFolder = useRef(folderIdFromUrl); currentFolder.current = folderIdFromUrl;
  const loadFolders = async () => { const next = await foldersQuery.read(); if (!next) throw new Error("폴더 목록 확인 실패"); return next; };
  const sortedFolders = useMemo(() => [...folders].sort((a,b) =>
    (a.systemType === "FAVORITES" ? 0 : 1) - (b.systemType === "FAVORITES" ? 0 : 1) ||
    a.name.localeCompare(b.name, "ko")), [folders]);
  const availableCategories = CATEGORIES.filter(code =>
    openedFolderPlaces.some(place => place.placeCategory === code));
  const nextSort = SORT_ORDER[(SORT_ORDER.indexOf(activeSort) + 1) % SORT_ORDER.length];
  const placeIds = [...new Set(openedFolderPlaces.map(place => place.placeId))];
  const engagementKey = placeIds.join(",");
  const engagementQuery = useReadQuery(account + ":folder-engagement:" + folderIdFromUrl + ":" + engagementKey,
    signal => getPlaceEngagementApi(placeIds, { signal }),
    Boolean(folderIdFromUrl) && placesQuery.status === "success" && placeIds.length > 0 && account !== "anonymous",
    () => getAuthSnapshot().accountKey === account);
  // Refresh the actual folder list and like totals only AFTER favorite server read-back.
  // The heart itself already paints the pending state immediately in usePlaceSaving.
  useEffect(() => {
    if (saving.favoriteStatus !== "success" || !folderIdFromUrl) return;
    if (openedFolder?.systemType === "FAVORITES") {
      void placesQuery.read();
      void foldersQuery.read();
    }
    if (placeIds.length) void engagementQuery.read();
  // One completed mutation triggers refresh; do not couple to query rerenders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving.favoriteStatus]);
  // Hook and dependencies are initialized before rendering any sort control.
  // Keep the confirmed counts and cards mounted during the post-like refresh.
  // Only the first load, without any previous counts, may block a sorted list.
  const hasEngagement = Array.isArray(engagementQuery.data);
  const sortingUnavailable = activeSort !== "기본순" &&
    placeIds.length > 0 && !hasEngagement;
  const countsById = useMemo(() => {
    const counts = new Map();
    (engagementQuery.data || []).forEach(row => counts.set(String(row.placeId), row));
    return counts;
  }, [engagementQuery.data]);
  const matchingPlaces = useMemo(() => {
    const q = term.trim().toLocaleLowerCase("ko");
    const rows = openedFolderPlaces.filter(place =>
      (category === "ALL" || place.placeCategory === category) &&
      (!q || [place.name, place.address, place.region].some(value =>
        String(value || "").toLocaleLowerCase("ko").includes(q))));
    if (activeSort === "기본순" || !hasEngagement) return rows;
    const field = activeSort === "좋아요순" ? "likeCount" : "reviewCount";
    return [...rows].sort((a,b) =>
      (countsById.get(String(b.placeId))?.[field] ?? -1) -
      (countsById.get(String(a.placeId))?.[field] ?? -1));
  }, [openedFolderPlaces, category, term, activeSort, hasEngagement, countsById]);
  const resetFolderView = () => {
    setActiveSort("기본순"); setTerm(""); setCategory("ALL");
    setSelectionMode(false); setSelectedIds([]);
  };
  const openFolder = folder => {
    if (folder?.id) { resetFolderView(); setSearchParams({ folderId: String(folder.id) }); }
  };

  const handleAddFolderClick = () => { createTask.reset(); setValidation(""); setCreateOpen(true); };
  const submitFolder = async () => {
    if (createTask.blocked || createTask.status === "success") return;
    const name = folderName.trim();
    if (!name || name.length > 255) { setValidation("폴더명은 공백만 입력할 수 없으며 1~255자로 입력해주세요."); return; }
    setValidation("");
    await createTask.run(() => api.post(FOLDERS_API, { name }), loadFolders, {
      failure: "폴더 생성에 실패했어요. 입력한 이름은 유지됩니다.",
      success: "폴더가 생성됐어요.",
      refreshFailure: "폴더는 생성됐지만 목록을 새로 불러오지 못했어요.",
    });
  };
  const beginRename = folder => {
    if (!folder || folder.systemType === "FAVORITES" || folderSelectionMode || renameTask.blocked) return;
    renameTask.reset();
    setRenameTarget(folder);
    setRenameName(folder.name);
    setRenameValidation("");
  };
  const submitRename = async () => {
    if (!renameTarget || renameTask.blocked || renameTask.status === "success") return;
    const name = renameName.trim();
    if (!name || name.length > 255) {
      setRenameValidation("폴더 이름은 1~255자로 입력해 주세요.");
      return;
    }
    if (name === renameTarget.name) {
      setRenameTarget(null);
      return;
    }
    setRenameValidation("");
    await renameTask.run(() =>
      api.patch(`${FOLDERS_API}/${encodeURIComponent(renameTarget.id)}`, { name }),
      async () => {
        const rows = await loadFolders();
        const changed = rows.find(row => String(row.id) === String(renameTarget.id));
        if (changed?.name !== name) throw new Error("폴더 이름 변경 결과 미확인");
        setRenameTarget(null);
        setRenameValidation("");
        return { confirmed: true, applied: true };
      }, {
        failure: "폴더 이름을 변경하지 못했어요.",
        success: "폴더 이름을 변경했어요.",
        refreshFailure: "변경 요청 후 폴더 이름을 다시 확인하지 못했어요.",
      });
  };
  const handlePlaceClick = (place) => {
    navigate(`/detail?id=${encodeURIComponent(place.placeId || place.id)}`, {
      state: { place },
    });
  };

  const toggleFolderSelected = id => setFolderSelectedIds(old => {
    const value = String(id);
    return old.includes(value) ? old.filter(item => item !== value) : [...old, value];
  });
  const handleDeleteFolders = async () => {
    if (deleteFolderTask.blocked || !folderSelectionMode || !folderSelectedIds.length) return;
    const ids = [...folderSelectedIds];
    const targets = folders.filter(folder => ids.includes(String(folder.id)) &&
      folder.systemType !== "FAVORITES");
    if (targets.length !== ids.length || !targets.length) return;
    if (!window.confirm(`선택한 폴더 ${ids.length}개를 삭제할까요?\n폴더의 저장 기록만 제거되며 실제 장소는 삭제되지 않습니다.`)) return;
    await deleteFolderTask.run(async () => {
      // Stop on failure; never automatically replay a partially committed batch.
      for (const folder of targets) {
        await api.delete(`${FOLDERS_API}/${encodeURIComponent(folder.id)}`);
      }
    }, async () => {
      const next = await loadFolders();
      if (getAuthSnapshot().accountKey !== account) throw new Error("계정 변경");
      const snapshot = await readSavedFolderSnapshot();
      syncSavedPlaces?.(snapshot.places, snapshot.complete);
      const complete = ids.every(id => !next.some(folder => String(folder.id) === id));
      if (complete) { setFolderSelectedIds([]); setFolderSelectionMode(false); }
      return { confirmed: complete, applied: complete };
    }, {
      failure:"폴더 삭제가 중단됐어요. 일부는 삭제되었을 수 있어 목록을 확인해 주세요.",
      success:"선택한 폴더를 삭제했어요.",
      refreshFailure:"삭제 요청 후 폴더 목록을 확인하지 못했어요.",
    });
  };
  const toggleSelected = id => setSelectedIds(old =>
    old.includes(id) ? old.filter(item => item !== id) : [...old, id]);
  const handleBulkRemove = async () => {
    if (bulkTask.blocked || !openedFolder || !selectedIds.length) return;
    const folderId = openedFolder.id;
    const targetIds = [...selectedIds];
    if (!window.confirm(`선택한 ${targetIds.length}개 장소를 이 폴더에서 제거할까요?`)) return;
    await bulkTask.run(async () => {
      // Stop at first failure; never automatically resubmit uncertain DELETEs.
      for (const id of targetIds) await api.delete(getFolderPlaceDeleteUrl(folderId, id));
    }, async () => {
      const places = await placesQuery.read();
      if (!Array.isArray(places) || currentAccount.current !== account ||
          String(currentFolder.current) !== String(folderId)) throw new Error("장소 목록 확인 실패");
      await loadFolders();
      const snapshot = await readSavedFolderSnapshot();
      if (getAuthSnapshot().accountKey !== account) throw new Error("계정 변경");
      syncSavedPlaces?.(snapshot.places, snapshot.complete);
      const missing = targetIds.every(id => !places.some(place => String(place.placeId) === String(id)));
      if (missing) { setSelectedIds([]); setSelectionMode(false); }
      return { confirmed: missing, applied: missing };
    }, {
      failure:"선택 삭제가 중단됐어요. 이미 제거된 장소가 있을 수 있으므로 최신 목록을 확인해 주세요.",
      success:"선택한 장소를 이 폴더에서 제거했어요.",
      refreshFailure:"삭제 요청 후 최신 장소 목록을 확인하지 못했어요.",
    });
  };
  const handleAddToSchedule = place => {
    const routePlace = {
      ...place, placeId: place.placeId || place.id,
      sourceId: place.sourceId || `folder-${place.placeId || place.id}`,
      title: place.name, desc: place.address || "", thumb: place.image || "",
      latitude: place.latitude ?? null, longitude: place.longitude ?? null,
    };
    localStorage.setItem("routeSelectedPlace", JSON.stringify(routePlace));
    localStorage.setItem("routeDraftPlaces", JSON.stringify([routePlace]));
    navigate(`/route-create?placeId=${encodeURIComponent(routePlace.placeId)}`, {
      state: { selectedPlace: routePlace, routePlaces: [routePlace] },
    });
  };
  const handleDiscoverPlacesClick = () => {
    if (!openedFolder?.id) return;

    navigate(`/search?folderId=${encodeURIComponent(openedFolder.id)}`);
  };

  return (
    <main className="v14-saved-page saved-places-page">
      <InputDialog open={createOpen} title="새 폴더 만들기" label="폴더명" value={folderName} maxLength={255}
        onChange={setFolderName} onClose={() => setCreateOpen(false)} onSubmit={submitFolder}
        busy={createTask.status === "running"} blocked={createTask.blocked || createTask.status === "success"}
        message={validation || createTask.message}
        closeLabel={createTask.status === "success" ? "닫기" : "취소"}
        onRetry={["refreshError", "unknown"].includes(createTask.status) ? createTask.retryRead : null} />

      <PlaceSavingFeedback saving={saving} suppressFolderLoading suppressFavoriteSuccess />
      <PlaceSaveModal saving={saving} />

      <div key={folderIdFromUrl || "folder-list"} className={`v14-saved-view v14-saved-view--${folderDirection}`}>
      <header className="v14-saved-heading">
        <h1>{openedFolder ? openedFolder.name : "저장한 장소"}</h1>
        {openedFolder && <p>폴더에 저장한 장소를 확인하고 정리해 보세요.</p>}
      </header>

      {foldersQuery.status === "error" && <div className="v14-saved-notice" role="alert">
        <p>폴더 목록을 불러오지 못했어요.</p>
        <button type="button" onClick={foldersQuery.retry}>폴더 목록 다시 불러오기</button>
      </div>}
      {folders.some(folder => folder.countUnknown) && <div className="v14-saved-notice" role="status">
        <p>일부 폴더의 장소 개수를 확인하지 못했어요.</p>
        <button type="button" onClick={foldersQuery.retry}>장소 개수 다시 확인</button>
      </div>}
      {deleteFolderTask.message && <div className="v14-saved-notice" role="status">
        {deleteFolderTask.message}
        {["unknown","refreshError"].includes(deleteFolderTask.status) &&
          <button type="button" onClick={deleteFolderTask.retryRead}>폴더 목록 다시 확인</button>}
        {deleteFolderTask.status === "error" && <button type="button" onClick={async () => {
          try {
            await loadFolders();
            const snapshot = await readSavedFolderSnapshot();
            syncSavedPlaces?.(snapshot.places, snapshot.complete);
            setFolderSelectedIds([]); setFolderSelectionMode(false); deleteFolderTask.reset();
          } catch { /* retain error while the server cannot be read */ }
        }}>목록 재조회 후 다시 선택</button>}
      </div>}
      {folderIdFromUrl && placesQuery.status === "error" && <div className="v14-saved-notice" role="alert">
        <p>이 폴더의 장소 목록을 불러오지 못했어요.</p>
        <button type="button" onClick={placesQuery.retry}>장소 목록 다시 불러오기</button>
      </div>}
      {bulkTask.message && <div className="v14-saved-notice" role="status">
        {bulkTask.message}
        {["unknown","refreshError"].includes(bulkTask.status) &&
          <button type="button" onClick={bulkTask.retryRead}>최신 목록 다시 확인</button>}
        {bulkTask.status==="error" && <button type="button" onClick={async ()=>{
          try {
            await placesQuery.read(); await loadFolders();
            setSelectedIds([]); setSelectionMode(false); bulkTask.reset();
          } catch { /* preserve failure until read-back succeeds */ }
        }}>목록 재조회 후 다시 선택</button>}
      </div>}

      {openedFolder ? <>
        <div className="v14-saved-folder-top-actions">
          <button type="button" className="v14-saved-add v14-saved-add-inline"
            onClick={handleDiscoverPlacesClick}>+ 새 장소 추가</button>
        </div>
        <label className="v14-saved-search">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="m15.5 15.5 5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input type="search" value={term} onChange={event=>setTerm(event.target.value)}
            placeholder="이 폴더에서 장소 검색" aria-label="저장한 장소 검색" />
        </label>
        <div className="v14-saved-categories" role="group" aria-label="장소 분류">
          {["ALL",...availableCategories].map(code =>
            <button key={code} type="button" className={category===code?"is-active":""}
              aria-pressed={category===code} onClick={()=>setCategory(code)}>
              {code==="ALL"?"전체":getPlaceCategoryLabel(code)}
            </button>)}
        </div>
        <div className="v14-saved-results-toolbar">
          {(term.trim() || category !== "ALL") &&
            <p className="v14-saved-result-summary" role="status">검색 결과 {matchingPlaces.length}곳</p>}
          <button type="button" className="v14-saved-sort-button"
            onClick={() => setActiveSort(nextSort)}
            aria-label={`${activeSort} 정렬, 누르면 ${nextSort}`}
            title={`다음 정렬: ${nextSort}`}>
            <SortIcon sort={activeSort} /><span>{activeSort}</span>
          </button>
          <button type="button" className={`v14-saved-trash-toggle ${selectionMode ? "is-complete" : ""}`}
            onClick={()=>{setSelectionMode(old=>!old);setSelectedIds([]);}}
            disabled={bulkTask.blocked} aria-pressed={selectionMode}
            aria-label={selectionMode ? "장소 선택 완료" : "장소 삭제 선택"}>
            {selectionMode ? <span>완료</span> : <TrashIcon />}
          </button>
        </div>
        {sortingUnavailable && engagementQuery.status !== "error" &&
          <p role="status" className="v14-saved-sort-status">{activeSort} 정렬 중...</p>}
        {sortingUnavailable && engagementQuery.status === "error" && <div className="v14-saved-notice" role="alert">
          좋아요·리뷰 정렬 정보를 불러오지 못했어요.
          <button type="button" onClick={engagementQuery.retry}>다시 조회</button>
        </div>}
        {isLoadingPlaces && <p role="status" className="v14-saved-loading">장소를 불러오는 중...</p>}
        {placesQuery.status==="success" && matchingPlaces.length===0 &&
          <p className="v14-saved-empty">조건에 맞는 저장 장소가 없어요.</p>}
        {!sortingUnavailable && <ul className="v14-saved-items">
          {matchingPlaces.map(place=><li key={place.id}>
            <div className={`v14-saved-card-shell ${selectionMode ? "is-selecting" : ""}`}>
              <div className="v14-saved-card-normal" inert={selectionMode}
                aria-hidden={selectionMode}>
                <PlaceExploreCard place={place} saving={saving}
                  confirmFavoriteRemoval={openedFolder.systemType === "FAVORITES"}
                  onDetail={handlePlaceClick} onSchedule={handleAddToSchedule}
                  likeCount={hasEngagement
                    ? countsById.get(String(place.placeId))?.likeCount : undefined} />
              </div>
              <label className="v14-saved-select-card" inert={!selectionMode}
                aria-hidden={!selectionMode}>
                {selectionMode && <>
                <input type="checkbox" className="v14-saved-circle-check"
                  aria-label={`${place.name} 선택`} disabled={!selectionMode}
                  checked={selectedIds.includes(place.placeId)}
                  onChange={()=>toggleSelected(place.placeId)} />
                <span className="v14-saved-select-photo">
                  <PlacePhoto place={place} src={place.imageUrl || place.thumbnailUrl || place.image || place.imgUrl || place.photo || getPlacePhoto(place.name).image} alt="" />
                </span>
                <span className="v14-saved-select-copy">
                  <small>{place.region || "지역 미제공"} · {place.placeCategoryLabel}</small>
                  <strong>{place.name}</strong>
                </span>
                </>}
              </label>
            </div>
          </li>)}
        </ul>}

      </> : <>
        <div className="v14-saved-folder-actions">
          <button type="button" className="v14-saved-add" onClick={handleAddFolderClick}
            disabled={folderSelectionMode}>+ 새 폴더 만들기</button>
          <button type="button" className={`v14-saved-trash-toggle ${folderSelectionMode?"is-complete":""}`}
            aria-label={folderSelectionMode?"폴더 선택 완료":"폴더 삭제 선택"}
            aria-pressed={folderSelectionMode} disabled={deleteFolderTask.blocked}
            onClick={()=>{setFolderSelectionMode(old=>!old);setFolderSelectedIds([]);}}>
            {folderSelectionMode ? <span>완료</span> : <TrashIcon />}
          </button>
        </div>
        {folderSelectionMode && <p className="v14-saved-selection-hint">
          삭제할 폴더를 선택하세요. 좋아하는 장소는 삭제할 수 없어요.
        </p>}
        {isLoadingFolders && <p role="status" className="v14-saved-loading">폴더를 불러오는 중...</p>}
        <ul className="v14-saved-folders">
          {sortedFolders.map(folder => <li key={folder.id}
            className={`v14-saved-folder-row ${folder.systemType==="FAVORITES"?"is-favorites":""} ${folderSelectionMode?"is-selecting":""}`}>
            <label className="v14-saved-folder-check">
              <input type="checkbox" className="v14-saved-circle-check"
                aria-label={`${folder.name} 폴더 선택`}
                disabled={!folderSelectionMode || folder.systemType==="FAVORITES" || deleteFolderTask.blocked}
                checked={folderSelectedIds.includes(String(folder.id))}
                onChange={()=>toggleFolderSelected(folder.id)} />
            </label>
            <div className="v14-saved-folder">
              <button type="button" className="v14-saved-folder-hit-area"
                aria-label={`${folder.name} 폴더 카드 열기`}
                onClick={()=>folderSelectionMode
                  ? folder.systemType!=="FAVORITES" && !deleteFolderTask.blocked && toggleFolderSelected(folder.id)
                  : openFolder(folder)} />
              <button type="button" className="v14-saved-folder-open"
                aria-label={`${folder.name} 폴더 열기`}
                onClick={()=>folderSelectionMode
                  ? folder.systemType!=="FAVORITES" && !deleteFolderTask.blocked && toggleFolderSelected(folder.id)
                  : openFolder(folder)}>
                <span className="v14-saved-folder-icon" aria-hidden="true">
                  {folder.systemType === "FAVORITES"
                    ? <HeartFolderIcon /> : <img src={folder.icon} alt="" />}
                </span>
              </button>
              <div className="v14-saved-folder-copy">
                {renameTarget && String(renameTarget.id) === String(folder.id) ? (
                  <form className="v14-saved-rename-inline"
                    onSubmit={event=>{event.preventDefault();void submitRename();}}>
                    <input autoFocus type="text" aria-label={`${folder.name} 새 폴더 이름`}
                      maxLength={255} value={renameName} disabled={renameTask.blocked}
                      onKeyDown={event=>{
                        if(event.key==="Escape" && !renameTask.blocked){
                          setRenameTarget(null);setRenameValidation("");
                        }
                      }}
                      onChange={event=>setRenameName(event.target.value)} />
                    <button type="submit" className="v14-saved-rename-save"
                      disabled={renameTask.blocked || !renameName.trim()}
                      aria-label="폴더 이름 저장" title="저장">✓</button>
                    <button type="button" className="v14-saved-rename-cancel"
                      disabled={renameTask.blocked} aria-label="폴더 이름 수정 취소"
                      onClick={()=>{setRenameTarget(null);setRenameValidation("");}}
                      title="취소">×</button>
                  </form>
                ) : (
                  <button type="button" className="v14-saved-folder-title"
                    onClick={()=>folderSelectionMode
                      ? folder.systemType!=="FAVORITES" && !deleteFolderTask.blocked && toggleFolderSelected(folder.id)
                      : folder.systemType==="FAVORITES" ? openFolder(folder) : beginRename(folder)}
                    aria-label={folder.systemType==="FAVORITES"
                      ? `${folder.name} 폴더 열기` : `${folder.name} 폴더 이름 수정`}
                    title={folder.systemType==="FAVORITES" ? "폴더 열기" : "이름을 눌러 수정"}>
                    <strong>{folder.title}</strong>
                    {!folderSelectionMode && folder.systemType!=="FAVORITES" &&
                      <svg className="v14-saved-rename-pencil" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m14.5 5.5 4 4M4 20l4.5-.8L19 8.7a2 2 0 0 0-2.8-2.8L5.7 16.4 4 20Z" />
                      </svg>}
                  </button>
                )}
                <small>{folder.countUnknown || folder.count===null ? "개수 미확인" : `${folder.count} 장소`}</small>
                {renameTarget && String(renameTarget.id)===String(folder.id) &&
                  (renameValidation || ["error","unknown","refreshError"].includes(renameTask.status)) &&
                  <span className="v14-saved-rename-error" role="status">
                    {renameValidation || renameTask.message}
                    {["unknown","refreshError"].includes(renameTask.status) &&
                      <button type="button" onClick={renameTask.retryRead}>변경 결과 확인</button>}
                  </span>}
              </div>
              <button type="button" className="v14-saved-folder-forward"
                aria-label={`${folder.name} 폴더로 이동`}
                onClick={()=>folderSelectionMode
                  ? folder.systemType!=="FAVORITES" && !deleteFolderTask.blocked && toggleFolderSelected(folder.id)
                  : openFolder(folder)}>
                <span aria-hidden="true" className="v14-saved-arrow">›</span>
              </button>
            </div>
          </li>)}
        </ul>

        {foldersQuery.status==="success" && sortedFolders.length===0 &&
          <p className="v14-saved-empty">아직 생성된 폴더가 없습니다.</p>}
      </>}
      </div>
      {/* Keep this element mounted while selection drops to zero, so the
          exit transition can descend instead of disappearing instantly. */}
      <div className={`v14-saved-floating-delete ${(
        openedFolder ? selectionMode && selectedIds.length > 0 :
          folderSelectionMode && folderSelectedIds.length > 0
      ) ? "is-visible" : ""}`}
        role="region"
        aria-label={openedFolder ? "선택한 장소 삭제" : "선택한 폴더 삭제"}
        aria-hidden={!(openedFolder ? selectionMode && selectedIds.length > 0 :
          folderSelectionMode && folderSelectedIds.length > 0)}
        inert={!(openedFolder ? selectionMode && selectedIds.length > 0 :
          folderSelectionMode && folderSelectedIds.length > 0)}>
        <button type="button"
          disabled={openedFolder ? bulkTask.blocked || !selectedIds.length || !selectionMode :
            deleteFolderTask.blocked || !folderSelectedIds.length || !folderSelectionMode}
          onClick={openedFolder ? handleBulkRemove : handleDeleteFolders}
          aria-label={openedFolder
            ? `선택한 장소 ${selectedIds.length}개 삭제하기`
            : `선택한 폴더 ${folderSelectedIds.length}개 삭제하기`}>
          <TrashIcon /><span>삭제하기</span>
          <strong>{openedFolder ? selectedIds.length : folderSelectedIds.length}</strong>
        </button>
      </div>
    </main>
  );
}

export default function SavedPlaces() {
  const account = useSessionKey();
  return <SavedPlacesContent key={account} />;
}
