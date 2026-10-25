import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import useTripResult from "./useTripResult";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import { getTripByIdApi, getTripPlacesApi, getTripsApi, deleteTripDayPlacesApi, renameTripTitleApi, updateTripApi } from "../api/tripApi";
import { uncertainMutation } from "../utils/useMutationTask";
import { formatTripDate, tripDays, tripStayLabel } from "./tripDetailModel";
import { readOptimizedVersions, saveOptimizedDay } from "./tripOptimizationVersionStore";
import { readTripDisplayPreferences, saveTripDisplayPreferences } from "./tripDetailPreferenceStore";
import { clockLabel, placeKey } from "./tripOptimizationModel";
import { optimizedStay } from "./optimizedVisitDraft";
import { uniqueTripTitle } from "./tripTitleDedup";
import TripOptimizedEditor from "./TripOptimizedEditor";
import TripDateEditModal from "./TripDateEditModal";
import TripInlineEditor from "./TripInlineEditor";
import TripMapModal from "./TripMapModal";
import "./TripDetailPage.css";

function Icon({ name }) {
  const shared = { viewBox: "0 0 24 24", width: 18, height: 18, fill: "none",
    stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (name === "list") return <svg {...shared}><path d="M8 6h12M8 12h12M8 18h12"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" strokeWidth="3"/></svg>;
  if (name === "grid") return <svg {...shared}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>;
  if (name === "route") return <svg {...shared}><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h5"/></svg>;
  if (name === "map") return <svg {...shared}><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/></svg>;
  if (name === "plus") return <svg {...shared}><path d="M12 5v14M5 12h14"/></svg>;
  if (name === "check") return <svg {...shared}><path d="m5 12 4 4L19 6"/></svg>;
  if (name === "trash") return <svg {...shared}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6"/></svg>;
  if (name === "clock") return <svg {...shared}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
  if (name === "share") return <svg {...shared}><circle cx="18" cy="5" r="2.25"/><circle cx="6" cy="12" r="2.25"/><circle cx="18" cy="19" r="2.25"/><path d="m8 11 7.8-4.6M8 13l7.8 4.6"/></svg>;
  if (name === "star") return <svg {...shared}><path d="m12 2 3.1 6.4 7 .9-5 5 .9 7-6-3.3-6 3.3.9-7-5-5 7-.9z"/></svg>;
  return <svg {...shared}><path d="M12 20h9M16.5 3.5l4 4L9 19H5v-4Z"/></svg>;
}

function PlaceTimeline({ day, onEdit, onPlaceDetail, onReview, showTimes }) {
  const { places, timeline } = day;
  if (!places.length) return <div className="v16-detail-empty">
    <span className="v16-detail-empty-symbol" aria-hidden="true">＋</span>
    <strong>아직 추가된 장소가 없어요.</strong>
    <button type="button" onClick={onEdit}>장소 추가하기</button>
  </div>;
  return <div className={"v16-detail-timeline" + (showTimes ? "" : " is-time-hidden")}>
    {places.map((place, index) => {
      const matching = timeline?.status === "success" ?
        timeline.items.find(item => Number(item.visitOrder) === Number(place.visitOrder)) : null;
      const time = place.arrivalTime || (day.optimized ? matching?.arrivalTime : "") || "";
      return <article className="v16-detail-place" key={place.tripPlaceId ?? place.id}>
        <time className="v16-detail-time-left" aria-hidden={!showTimes} aria-label={time ? "방문 시각 " + String(time).slice(0, 5) : "방문 시각 미정"}>
          {time ? String(time).slice(0, 5) : "—"}
        </time>
        <span className="v16-detail-sequence" aria-hidden="true">{index + 1}</span>
        <div className="v16-detail-place-copy">
          <div className="v16-detail-place-heading">
            {Number(place.placeId) > 0 ?
              <button type="button" className="v16-detail-place-link"
                aria-label={place.placeName + " 장소 상세 보기"} onClick={() => onPlaceDetail(place)}>
                {place.placeName}<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
              </button> : <strong>{place.placeName}</strong>}
            {Number(place.placeId) > 0 && <button type="button" className="v16-detail-review-link"
              aria-label={place.placeName + " 리뷰 작성"} title="리뷰 작성"
              onClick={() => onReview(place)}><Icon name="star"/><small>리뷰</small></button>}
          </div>
          {place.memo && <p className="v16-detail-memo">{place.memo}</p>}
        </div>
      </article>;
    })}
  </div>;
}

function DaySection({ value, onEdit, onPlaceDetail, onReview, editMode, optimizedEdit, optimizedDraft, onSaveOptimized,
  tripId, onRefresh, openFirst, openPlace,
  showTimes, onToggleTimes, deleteMode, onToggleDelete, deleteSelected, onSelectDelete, deleteBusy }) {
  const [optimizedDeleteMode, setOptimizedDeleteMode] = useState(false);
  return <section className="v16-detail-day-card" aria-label={value.label + " 일정"}>
    <header className="v16-detail-day-heading">
      <div>
        <div className="v16-detail-day-title-line">
          <h3>{value.label}</h3>
          {editMode && optimizedEdit && <span className={"v16-optimized-mode-label " +
            (optimizedDraft?.mode === "quick" ? "is-quick" : "is-careful")}>
            {optimizedDraft?.mode === "quick" ? "빠른 정렬" : "최적화"}
          </span>}
          {!editMode && <div className="v16-detail-day-time-controls">
            <button type="button" className={"v16-detail-time-toggle" + (showTimes ? " is-on" : "")}
              aria-label={value.label + " 방문 시간 " + (showTimes ? "숨기기" : "표시하기")}
              aria-pressed={showTimes} title={showTimes ? "방문 시간 숨기기" : "방문 시간 표시하기"}
              onClick={() => onToggleTimes(value.day)}><Icon name="clock"/><span className="v16-detail-time-switch-track" aria-hidden="true"><span/></span></button>
            <span className="v16-detail-time-help-wrap">
              <button type="button" className="v16-detail-time-help-trigger"
                aria-label={value.label + " 시간 표시 도움말"} aria-describedby={"v16-time-help-" + value.day}>?</button>
              <span id={"v16-time-help-" + value.day} className="v16-detail-time-help" role="tooltip">
                시계 아이콘으로 방문 시각 표시만 바꿀 수 있어요. 실제 방문 시간은 변경되지 않아요.
              </span>
            </span>
          </div>}
        </div>
        <div className="v16-detail-day-meta">
          <span>{value.dateLabel}</span><span aria-hidden="true">·</span><span>{value.places.length}곳</span>
        </div>
      </div>
      <div className="v16-detail-day-actions">
        {editMode ? (optimizedEdit ? <>
          <button type="button" className="v16-detail-day-add"
            aria-label={value.label + "에 최적화 장소 추가"}
            disabled={!optimizedDraft}
            onClick={() => onEdit(value.day,true)}><Icon name="plus"/></button>
          <button type="button" className={"v16-detail-day-trash" + (optimizedDeleteMode ? " is-active" : "")}
            aria-label={value.label + (optimizedDeleteMode ? " 최적화 삭제 선택 완료" : " 최적화 장소 삭제 선택")}
            aria-pressed={optimizedDeleteMode}
            disabled={!optimizedDraft}
            onClick={() => setOptimizedDeleteMode(v => !v)}> 
            {optimizedDeleteMode ? "완료" : <Icon name="trash"/>}
          </button>
        </> : <>
          <button type="button" className="v16-detail-day-add" aria-label={value.label + "에 장소 추가"}
            disabled={deleteBusy} onClick={() => onEdit(value.day, true)}><Icon name="plus"/></button>
          <button type="button" className={"v16-detail-day-trash" + (deleteMode ? " is-active" : "")}
            aria-label={value.label + (deleteMode ? " 삭제 선택 완료" : " 장소 삭제 선택")}
            aria-pressed={deleteMode}
            onClick={onToggleDelete} disabled={deleteBusy}>
            {deleteMode ? "완료" : <Icon name="trash"/>}
          </button>
        </>) : <button type="button" className="v16-detail-day-edit" aria-label={value.label + " 편집"}
          onClick={() => onEdit(value.day, false, true)}><Icon name="edit"/> 편집</button>}
      </div>
    </header>
    {editMode && optimizedEdit ? <TripOptimizedEditor key={value.day} day={value}
        draft={optimizedDraft} onSave={onSaveOptimized} onPlaceDetail={onPlaceDetail}
        deleteMode={optimizedDeleteMode} onDeleteModeChange={setOptimizedDeleteMode}/>
      : editMode ? <TripInlineEditor tripId={tripId} day={value} onRefresh={onRefresh}
        onPlaceDetail={onPlaceDetail} onAddPlaces={() => onEdit(value.day, true)}
        autoOpenFirst={openFirst} autoOpenPlace={openPlace} deleteMode={deleteMode}
        externalDeleteSelection={deleteSelected} onExternalDeleteSelection={onSelectDelete}
        externalDeleteBusy={deleteBusy}/> : <>
      {value.optimizedStale && <p className="v16-detail-timeline-warning">
        원본 일정이 변경되었어요. 이 최적화안은 그대로 사용할 수 있지만, 변경된 장소나 시간은 경로 계산에 반영되지 않았으니 필요하면 다시 최적화해 주세요.
      </p>}
      {value.timeline?.status === "error" && <p className="v16-detail-timeline-warning">방문 시간은 확인되지 않았어요. 저장된 장소 순서는 그대로 표시합니다.</p>}
      <PlaceTimeline day={value} onEdit={() => onEdit(value.day, true)}
        onPlaceDetail={onPlaceDetail} onReview={onReview} showTimes={showTimes}/>
    </>}
  </section>;
}

export default function TripDetailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const account = useSessionKey();
  const id = params.get("id");
  const originSuffix = params.get("origin") === "past" ? "&origin=past" : "";
  const editMode = params.get("edit") === "1";
  const editVersion = params.get("version") === "optimized" ? "optimized" : "manual";
  const optimizedEdit = editMode && editVersion === "optimized";
  const editDay = Number(params.get("day")) || 1;
  const openFirst = params.get("open") === "first";
  const openPlace = /^\d+$/.test(params.get("place") || "") ? params.get("place") : null;
  const result = useTripResult(id);
  const days = useMemo(() => tripDays(result.trip, result.places, result.timelines),
    [result.trip, result.places, result.timelines]);
  const [view, setView] = useState(() => readTripDisplayPreferences(id, account).view);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hiddenTimeDays, setHiddenTimeDays] = useState({});
  const [mapOpen, setMapOpen] = useState(false);
  const [version, setVersion] = useState(() => readTripDisplayPreferences(id, account).version);
  const [optimizedRevision, setOptimizedRevision] = useState(0);
  const optimizedVersions = useMemo(() =>
    result.status === "success" ? readOptimizedVersions(id, account, result.places) : {},
    // A local draft save increments this revision to invalidate the storage snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result.status, result.places, id, account, optimizedRevision]);
  const hasOptimized = Object.keys(optimizedVersions).length > 0;
  const activeVersion = editMode ? editVersion : version;
  const displayDays = useMemo(() => days.map(day => {
    const draft = optimizedVersions[String(day.day)];
    if (activeVersion !== "optimized") return day;
    if (!draft) return { ...day, places: [], optimized: false };
    const rows = draft.rows || [];
    const arranged = draft.order.map((key, index) => {
      const original = draft.sourcePlaces?.[String(key)] ||
        draft.addedPlaces?.[String(key)] ||
        day.places.find(p => placeKey(p) === String(key)) ||
        (rows.find(row => String(row.id) === String(key))
          ? { tripPlaceId: String(key), placeName: rows.find(row => String(row.id) === String(key)).name || "이전 일정의 장소",
              placeId: null, arrivalTime: "", stayDuration: 0, memo: "" } : null);
      const matching = rows.find(row => String(row.id) === String(key) &&
        ["start", "fixed", "place", "end"].includes(row.type));
      return original ? { ...original, visitOrder: index + 1,
        arrivalTime: matching ? (matching.time != null ? clockLabel(matching.time) : "") : original.arrivalTime,
        stayDuration: optimizedStay(draft, original),
        memo: draft.memoOverrides && Object.prototype.hasOwnProperty.call(draft.memoOverrides, String(key))
          ? draft.memoOverrides[String(key)] : original.memo } : null;
    }).filter(Boolean);
    return { ...day, optimized: true, optimizedStale: Boolean(draft.stale), places: arranged,
      timeline: { status: "success", items: arranged.map(place =>
        ({ visitOrder: place.visitOrder, arrivalTime: place.arrivalTime })) } };
  }), [days, optimizedVersions, activeVersion]);
  const [notice, setNotice] = useState("");
  const [editWarning, setEditWarning] = useState(null);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState([]);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkBlocked, setBulkBlocked] = useState(false);
  const [bulkNotice, setBulkNotice] = useState("");
  const bulkLock = useRef(false);
  const bulkGroups = days.map(day => ({
    day: day.day, label: day.label,
    ids: day.places.filter(place => bulkSelected.includes(placeKey(place)))
      .map(place => Number(placeKey(place))),
  })).filter(group => group.ids.length > 0);
  const [dateOpen, setDateOpen] = useState(false);
  const [dateBusy, setDateBusy] = useState(false);
  const [dateError, setDateError] = useState("");
  const dateLock = useRef(false);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [titleSaving, setTitleSaving] = useState(false);
  const [titleUnknown, setTitleUnknown] = useState(false);
  const [titleNotice, setTitleNotice] = useState("");
  const titleLock = useRef(false);
  const titleCancelled = useRef(false);
  const mounted = useRef(true);
  const latest = useRef({ id, account });
  latest.current = { id, account };

  // Restore the last selection when returning from the trip list or switching trips.
  // Do not override it when dates load, an editor opens, or an itinerary refreshes.
  const dayCount = days.length;
  const preferenceIdentity = useRef({ id, account });
  useEffect(() => {
    if (preferenceIdentity.current.id === id && preferenceIdentity.current.account === account) return;
    preferenceIdentity.current = { id, account };
    const saved = readTripDisplayPreferences(id, account);
    setView(saved.view);
    setVersion(saved.version);
    setActiveIndex(0);
    setHiddenTimeDays({});
  }, [id, account]);
  useEffect(() => {
    if (editMode && editDay >= 1 && editDay <= dayCount) setActiveIndex(editDay - 1);
  }, [editMode, editDay, dayCount]);
  useEffect(() => {
    // Keep the selected day valid after shortening dates, without resetting it
    // while a refresh temporarily has no loaded days.
    if (dayCount > 0) setActiveIndex(index => Math.min(index, dayCount - 1));
  }, [dayCount]);
  // A missing optimized draft is not a valid saved display version.
  useEffect(() => {
    if (result.status === "success" && !hasOptimized && version === "optimized") {
      setVersion("manual");
      saveTripDisplayPreferences(id, account, { version: "manual" });
    }
  }, [result.status, hasOptimized, version, id, account]);
  const chooseView = next => {
    setView(next);
    saveTripDisplayPreferences(id, account, { view: next });
  };
  const chooseVersion = next => {
    setVersion(next);
    saveTripDisplayPreferences(id, account, { version: next });
  };
  useEffect(() => {
    mounted.current = true;
    setNotice("");
    setEditWarning(null);
    setMapOpen(false);
    setDateOpen(false);setDateBusy(false);setDateError("");dateLock.current=false;
    setTitleEditing(false);
    setTitleDraft("");
    setTitleSaving(false);
    setTitleUnknown(false);
    setTitleNotice("");
    setBulkDeleteMode(false);
    setBulkSelected([]);
    setBulkConfirm(false);
    setBulkBlocked(false);
    setBulkNotice("");
    return () => { mounted.current = false; };
  }, [id, account]);

  const toggleBulkDelete = () => {
    if (bulkBusy || bulkBlocked) return;
    setBulkDeleteMode(!bulkDeleteMode);
    setBulkSelected([]);
    setBulkConfirm(false);
    setBulkNotice("");
  };
  const toggleBulkSelection = visitId => {
    if (!bulkDeleteMode || bulkBusy || bulkBlocked) return;
    setBulkSelected(current => current.includes(visitId) ?
      current.filter(item => item !== visitId) : [...current, visitId]);
  };
  const performBulkDelete = async () => {
    if (!bulkDeleteMode || bulkLock.current || bulkBlocked || !bulkGroups.length) return;
    const groups = bulkGroups.map(group => ({ ...group, ids: [...group.ids] }));
    bulkLock.current = true;
    setBulkBusy(true);
    setBulkConfirm(false);
    setBulkNotice("");
    let startedWriting = false;
    let completed = 0;
    const alive = () => mounted.current && latest.current.id === id &&
      latest.current.account === account && getAuthSnapshot().accountKey === account;
    try {
      // Recheck the day-scoped trip-place associations before any deletion.
      const fresh = await getTripPlacesApi(id);
      if (!alive()) return;
      if (!Array.isArray(fresh) || groups.some(group => group.ids.some(visitId =>
        !fresh.some(place => Number(place.day) === group.day &&
          Number(placeKey(place)) === visitId)))) {
        throw new Error("일정이 변경되었어요. 다시 조회한 뒤 삭제할 장소를 선택해 주세요.");
      }
      for (const group of groups) {
        if (!alive()) return;
        startedWriting = true;
        const remaining = await deleteTripDayPlacesApi({
          tripId: id, day: group.day, tripPlaceIds: group.ids,
        });
        completed++;
        if (!Array.isArray(remaining) || remaining.some(place =>
          group.ids.includes(Number(placeKey(place))))) {
          throw new Error("삭제 결과를 확인하지 못했어요.");
        }
      }
      const after = await getTripPlacesApi(id);
      if (!alive()) return;
      if (!Array.isArray(after) || groups.some(group => group.ids.some(visitId =>
        after.some(place => Number(place.day) === group.day &&
          Number(placeKey(place)) === visitId)))) {
        throw new Error("삭제 후 저장 상태를 확인하지 못했어요.");
      }
      await result.retry();
      if (!alive()) return;
      setBulkSelected([]);
      setBulkDeleteMode(false);
      setBulkNotice("선택한 " + groups.reduce((total, group) => total + group.ids.length, 0) + "곳을 일정에서 삭제했어요.");
    } catch (error) {
      if (!alive()) return;
      if (completed > 0 || (startedWriting && uncertainMutation(error))) {
        setBulkBlocked(true);
        setBulkNotice("일부 삭제 결과를 확인하지 못했어요. 재요청하지 말고 일정을 다시 조회해 주세요.");
      } else {
        setBulkNotice(error?.message || "선택한 장소를 삭제하지 못했어요.");
      }
    } finally {
      bulkLock.current = false;
      if (alive()) setBulkBusy(false);
    }
  };
  const enterEditor = (chosen, first = false, targetVersion = "manual") => {
    if (view === "tabs") setActiveIndex(Math.max(0, chosen - 1));
    navigate("/route-result?id=" + encodeURIComponent(id) + "&edit=1&day=" + chosen +
      (first ? "&open=first" : "") + (targetVersion === "optimized" ? "&version=optimized" : "") + originSuffix);
  };
  const saveOptimizedEdit = (day, nextDraft) => {
    const current = readOptimizedVersions(id, account, result.places)[String(day)];
    if (!current || !Array.isArray(nextDraft.order) ||
      !nextDraft.order.length ||
      new Set(nextDraft.order.map(String)).size !== nextDraft.order.length ||
      nextDraft.order.some(key => !current.order.includes(String(key)) &&
        !nextDraft.addedPlaces?.[String(key)])) return false;
    const stored = saveOptimizedDay(id, account, result.places, day, nextDraft);
    if (stored) setOptimizedRevision(count => count + 1);
    return stored;
  };
  const switchEditVersion = target => {
    if (target === editVersion) return;
    const chosen = view === "tabs" ? activeIndex + 1 : editDay;
    if (target === "optimized") {
      const draft = optimizedVersions[String(chosen)];
      if (draft && !draft.manuallyEdited) {
        setEditWarning({chosen,first:false,isCareful:draft.mode !== "quick",fromEdit:true});
        return;
      }
      chooseVersion("optimized");
      navigate("/route-result?id="+encodeURIComponent(id)+"&edit=1&day="+chosen+"&version=optimized"+originSuffix);
      return;
    }
    chooseVersion("manual");
    navigate("/route-result?id="+encodeURIComponent(id)+"&edit=1&day="+chosen+originSuffix);
  };
  const goNextStage = (kind, day, add = false, first = false) => {
    if (bulkBusy) return;
    if (kind === "map") {
      setMapOpen(true);
      return;
    }
    const chosen = day || (view === "tabs" ? activeIndex + 1 : 1);
    if (add) {
      navigate("/route-add-places?id=" + encodeURIComponent(id) + "&day=" + chosen +
        (editMode && optimizedEdit ? "&version=optimized" : "") + originSuffix);
      return;
    }
    if (editMode) return;
    const candidate = version === "optimized" ? optimizedVersions[String(chosen)] : null;
    const selectedOptimization = candidate || null;
    if (selectedOptimization && !selectedOptimization.manuallyEdited) {
      setEditWarning({ chosen, first,
        isCareful: selectedOptimization.mode !== "quick", fromEdit: false });
      return;
    }
    // Editing this day must not change the user's selected itinerary version.
    enterEditor(chosen, first, version === "optimized" && hasOptimized ? "optimized" : "manual");
  };
  const finishEditing = () => {
    if (bulkBusy) return;
    navigate("/route-result?id=" + encodeURIComponent(id) + originSuffix);
  };
  const goPlaceDetail = place => {
    const placeId = Number(place.placeId);
    if (!Number.isSafeInteger(placeId) || placeId <= 0) return;
    navigate("/detail?id=" + encodeURIComponent(placeId), {
      state: { place: { id: placeId, placeId, name: place.placeName,
        latitude: place.latitude, longitude: place.longitude, address: place.address || "" },
        from: "/route-result?id=" + encodeURIComponent(id) + (editMode
          ? "&edit=1&day=" + editDay + (optimizedEdit ? "&version=optimized" : "") : "") },
    });
  };

  const goReview = place => {
    const placeId = Number(place.placeId);
    if (!Number.isSafeInteger(placeId) || placeId <= 0) return;
    navigate("/detail/review?id=" + encodeURIComponent(placeId), {
      state: { from: "/route-result?id=" + encodeURIComponent(id) },
    });
  };

  const saveTripDates = async (startDate, endDate) => {
    if (dateLock.current || result.status !== "success") return;
    dateLock.current = true;
    setDateBusy(true);
    setDateError("");
    const original = result.trip;
    const owner = account;
    const alive = () => mounted.current && latest.current.id === id &&
      latest.current.account === owner && getAuthSnapshot().accountKey === owner;
    try {
      const length = Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86400000) + 1;
      if (!Number.isInteger(length) || length < 1 || length > 366) {
        throw new Error("여행 기간은 1~366일 사이로 선택해 주세요.");
      }
      // Never silently drop a visit from a day that no longer fits the shortened trip.
      const [fresh, visits] = await Promise.all([getTripByIdApi(id), getTripPlacesApi(id)]);
      if (!alive()) return;
      if (fresh.title !== original.title || fresh.destination !== original.destination ||
        fresh.startDate !== original.startDate || fresh.endDate !== original.endDate ||
        fresh.latitude !== original.latitude || fresh.longitude !== original.longitude) {
        throw new Error("일정이 다른 곳에서 변경되었어요. 닫고 다시 조회해 주세요.");
      }
      if (visits.some(place => Number(place.day) > length)) {
        throw new Error("삭제되는 일차에 방문 장소가 있어요. 먼저 해당 일차의 장소를 옮겨 주세요.");
      }
      const updated = await updateTripApi(id, { ...fresh, startDate, endDate });
      if (!alive()) return;
      if (updated.startDate !== startDate || updated.endDate !== endDate) {
        throw new Error("서버에서 날짜 수정을 확인하지 못했어요. 일정을 다시 조회해 주세요.");
      }
      const verified = await getTripByIdApi(id);
      if (!alive()) return;
      if (verified.startDate !== startDate || verified.endDate !== endDate) {
        throw new Error("저장된 날짜가 다릅니다. 일정을 다시 조회해 주세요.");
      }
      setDateOpen(false);
      await result.refreshInPlace();
    } catch (error) {
      if (alive()) setDateError(error?.message || "날짜 변경 결과를 확인하지 못했어요. 다시 조회해 주세요.");
    } finally {
      dateLock.current = false;
      if (alive()) setDateBusy(false);
    }
  };
  const startTitleEdit = () => {
    if (titleSaving || result.status !== "success") return;
    titleCancelled.current = false;
    setTitleDraft(result.trip.title);
    setTitleEditing(true);
    if (!titleUnknown) setTitleNotice("");
  };
  const saveTitle = async event => {
    event?.preventDefault?.();
    if (titleCancelled.current) return;
    if (titleLock.current || titleUnknown || result.status !== "success") return;
    const requestedTitle = titleDraft.trim();
    if (!requestedTitle || requestedTitle.length > 100) {
      setTitleNotice("일정명은 1~100자로 입력해 주세요.");
      return;
    }
    if (requestedTitle === result.trip.title) {
      setTitleEditing(false);
      setTitleNotice("");
      return;
    }
    const tripId = id, owner = account;
    const alive = () => mounted.current && latest.current.id === tripId &&
      latest.current.account === owner && getAuthSnapshot().accountKey === owner;
    titleLock.current = true;
    setTitleSaving(true);
    setTitleNotice("");
    let updated = false;
    try {
      const titles = await getTripsApi();
      if (!alive()) return;
      const title = uniqueTripTitle(requestedTitle, titles, tripId);
      const saved = await renameTripTitleApi({ tripId, title });
      updated = true;
      if (!alive()) return;
      if (saved.title !== title) throw new Error("일정명 수정 응답을 확인할 수 없습니다.");
      const verified = await getTripByIdApi(tripId);
      if (!alive()) return;
      if (verified.title !== title) throw new Error("저장된 일정명을 확인할 수 없습니다.");
      setTitleEditing(false);
      setTitleNotice("");
      void result.retry();
    } catch (error) {
      if (!alive()) return;
      const uncertain = updated || uncertainMutation(error);
      if (uncertain) setTitleUnknown(true);
      setTitleNotice(uncertain
        ? "일정명 변경 여부를 확인하지 못했어요. 다시 조회해 주세요."
        : "일정명을 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      titleLock.current = false;
      if (alive()) setTitleSaving(false);
    }
  };
  const checkTitle = () => {
    if (titleSaving) return;
    setTitleEditing(false);
    setTitleUnknown(false);
    setTitleNotice("");
    void result.retry();
  };

  if (result.status === "loading") return <main className="v16-detail-page">
    <p className="v16-detail-query" role="status">여행 일정을 불러오는 중...</p>
  </main>;
  if (result.status !== "success" || !days.length) return <main className="v16-detail-page">
    <section className="v16-detail-problem" role="alert">
      <h1>일정을 확인할 수 없어요</h1>
      <p>{result.error || "일정 날짜를 확인하지 못했어요."}</p>
      <button type="button" onClick={() => { if (result.status === "error") void result.retry(); else navigate("/schedule"); }}>
        {result.status === "error" ? "다시 조회" : "내 여행 일정으로"}
      </button>
    </section>
  </main>;

  return <main id="v16-detail-export" data-export-ready="true" data-export-context={String(id)}
    className={"v16-detail-page" + (editMode ? " is-editing" : "")}>
    <section className="v16-detail-summary">
      <p className="v16-detail-eyebrow">{editMode ? "편집 중" : "MY TRIP"}</p>
      {titleEditing ? <h1 className="v16-detail-title-editing">
        <input autoFocus aria-label="일정명" value={titleDraft} maxLength={100}
          disabled={titleSaving || titleUnknown}
          onChange={event => setTitleDraft(event.target.value)}
          onBlur={saveTitle}
          onKeyDown={event => {
            if (event.key === "Enter") { event.preventDefault();event.currentTarget.blur(); }
            if (event.key === "Escape" && !titleSaving) {
              event.preventDefault();titleCancelled.current = true;setTitleEditing(false);
              if (!titleUnknown) setTitleNotice("");
            }
          }}/>
      </h1> : <h1 aria-labelledby="v16-trip-detail-title"><button type="button" className="v16-detail-title-action"
        onClick={startTitleEdit} aria-label="일정명 수정" title="일정명 수정">
        <span id="v16-trip-detail-title">{result.trip.title}</span><Icon name="edit"/>
      </button></h1>}
      {titleNotice && <p className="v16-detail-title-notice" role={titleUnknown ? "alert" : "status"}>
        {titleNotice}
        {titleUnknown && <button type="button" onClick={checkTitle}>일정 다시 조회</button>}
      </p>}
      <div className="v16-detail-meta">
        <span>{result.trip.destination || "여행지 미정"}</span>
        <button type="button" className="v167-trip-dates" aria-label="여행 날짜 수정"
          title="여행 날짜 수정" onClick={() => {setDateError("");setDateOpen(true);}}>
          <span>{formatTripDate(result.trip.startDate)} ~ {formatTripDate(result.trip.endDate)}</span>
          <Icon name="edit"/>
        </button>
        <strong>{tripStayLabel(days.length)}</strong>
      </div>
      <div className="v16-detail-actions">
        <button type="button" className="v16-detail-action-primary" disabled={bulkBusy}
          onClick={() => navigate("/route-optimize?id=" + encodeURIComponent(id) +
            "&day=" + (view === "tabs" ? (activeIndex + 1) : 1))}>
          <Icon name="route"/> 경로 최적화
        </button>
        <div className="v16-detail-secondary-actions">
          <button type="button" onClick={() => goNextStage("map")}><Icon name="map"/> 지도 보기</button>
          {editMode
            ? <button type="button" className="v16-detail-finish" disabled={bulkBusy} onClick={finishEditing}><Icon name="check"/> 편집 완료</button>
            : <button type="button" onClick={() => goNextStage("edit")}><Icon name="edit"/> 편집하기</button>}
        </div>
        {!editMode && <button type="button" className="v16-detail-share-button"
          onClick={() => window.dispatchEvent(new Event("nomango:open-trip-share"))}>
          <Icon name="share"/> 여행 일정 공유
        </button>}
      </div>

      {notice && <p role="status" className="v16-detail-notice">
        {notice}
      </p>}
    </section>
    <section className="v16-detail-schedule" aria-label="여행 일정 목록">
      <div className={"v16-detail-view-toolbar" + (hasOptimized ? " has-optimized" : "")}>
        <div className="v16-detail-view-toggle" role="group" aria-label="보기 방식 전환">
          <button type="button" aria-label="목록형" title="목록형" aria-pressed={view === "list"}
            className={view === "list" ? "is-active" : ""} onClick={() => chooseView("list")}>
            <Icon name="list"/>{!hasOptimized && " 목록형"}</button>
          <button type="button" aria-label="버튼형" title="버튼형" aria-pressed={view === "tabs"}
            className={view === "tabs" ? "is-active" : ""} onClick={() => chooseView("tabs")}>
            <Icon name="grid"/>{!hasOptimized && " 버튼형"}</button>
        </div>
        {hasOptimized && <div className="v16-detail-version-toggle" role="group"
          aria-label={editMode ? "편집 일정 버전 전환" : "일정 버전 전환"}>
          <button type="button" aria-pressed={activeVersion === "manual"}
            className={activeVersion === "manual" ? "is-active" : ""}
            onClick={() => editMode ? switchEditVersion("manual") : chooseVersion("manual")}>
            직접 만든 일정</button>
          <button type="button" aria-pressed={activeVersion === "optimized"}
            className={activeVersion === "optimized" ? "is-active" : ""}
            onClick={() => editMode ? switchEditVersion("optimized") : chooseVersion("optimized")}>
            최적화한 일정</button>
        </div>}
      </div>
      {hasOptimized && !editMode && <p className="v16-detail-local-note">
        최적화한 일정은 현재 브라우저에 보관돼요. 다른 기기와 동기화되지 않아요.
      </p>}
      {view === "tabs" && <div className="v16-detail-day-scroller" role="group" aria-label="일차 선택">
        {days.map((day, i) => <button type="button" key={day.day}
          aria-pressed={activeIndex === i} className={activeIndex === i ? "is-selected" : ""}
          onClick={() => setActiveIndex(i)}>
          <strong>{day.label}</strong><small>{day.dateLabel}</small>
        </button>)}
      </div>}
      <div className={"v16-detail-day-list is-" + view + " is-" + activeVersion}>
        {(view === "list" ? (editMode && !optimizedEdit ? days : displayDays) :
          [editMode && !optimizedEdit ? (days[activeIndex] || days[0]) : (displayDays[activeIndex] || displayDays[0])])
          .map(day => <DaySection key={day.day} value={day} editMode={editMode}
            optimizedEdit={optimizedEdit} optimizedDraft={optimizedVersions[String(day.day)]}
            onSaveOptimized={saveOptimizedEdit}
            tripId={id} onRefresh={result.refreshInPlace} onPlaceDetail={goPlaceDetail}
            onReview={goReview} openFirst={editMode && openFirst && day.day === editDay}
            openPlace={editMode && day.day === editDay ? openPlace : null}
            deleteMode={bulkDeleteMode} onToggleDelete={toggleBulkDelete}
            deleteSelected={bulkSelected} onSelectDelete={toggleBulkSelection}
            deleteBusy={bulkBusy || bulkBlocked}
            showTimes={!hiddenTimeDays[day.day]}
            onToggleTimes={selectedDay => setHiddenTimeDays(current => ({
              ...current, [selectedDay]: !current[selectedDay],
            }))}
            onEdit={(selectedDay, add, first) => goNextStage("edit", selectedDay, add, first)}/>)}
      </div>
      {editMode && bulkNotice && <div className="v16-detail-notice" role={bulkBlocked ? "alert" : "status"}>
        {bulkNotice}
        {bulkBlocked && <button type="button" onClick={() => {
          setBulkBlocked(false);
          setBulkSelected([]);
          setBulkDeleteMode(false);
          setBulkNotice("");
          void result.retry();
        }}>일정 다시 조회</button>}
      </div>}
    </section>
    {mapOpen && <TripMapModal trip={result.trip}
      days={editMode && !optimizedEdit ? days : displayDays}
      initialDay={view === "tabs" ? (days[activeIndex]?.day || 1) :
        (displayDays.find(day => day.places.length)?.day || 1)}
      owner={account + ":" + id + ":" + activeVersion} onClose={() => setMapOpen(false)}/>}
    {dateOpen && <TripDateEditModal startDate={result.trip.startDate}
      endDate={result.trip.endDate} busy={dateBusy} error={dateError}
      onClose={() => {if (!dateLock.current) {setDateOpen(false);setDateError("");}}}
      onSave={saveTripDates}/>}
    {editWarning && createPortal(
      <div className={"v16-detail-edit-guard-overlay" +
        (editWarning.isCareful ? " is-careful" : " is-quick")}>
        <div className="v16-detail-edit-guard-dialog" role="alertdialog" aria-modal="true"
          aria-label="최적화한 일정 편집 경고" aria-describedby="v16-detail-edit-guard-description"
          onKeyDown={event => { if (event.key === "Escape") setEditWarning(null); }}>
          <span className="v16-detail-edit-guard-icon" aria-hidden="true">!</span>
          <strong>{editWarning.isCareful
            ? "예약과 동선의 최적화 결과가 달라질 수 있어요"
            : "최적화한 동선이 달라질 수 있어요"}</strong>
          <p id="v16-detail-edit-guard-description">
            {editWarning.isCareful
              ? "꼼꼼한 최적화는 예약 시각과 방문 순서를 함께 고려했어요. 장소·방문 시간·머무르기를 변경하면 예약에 늦거나 현재 최적화안을 다시 계산해야 할 수 있어요."
              : "장소·방문 시간·머무르기를 변경하면 빠르게 정렬한 동선과 예상 시간이 달라져 최적화를 다시 해야 할 수 있어요."}
            {" "}계속하면 최적화한 일정만 별도로 수정해요. 직접 만든 원본 일정은 변경되지 않으며, 수정 후에는 이동 시간과 예약 조건을 다시 확인해 주세요.
          </p>
          <div className="v16-detail-edit-guard-actions">
            <button type="button" autoFocus onClick={() => setEditWarning(null)}>취소</button>
            <button type="button" onClick={() => {
              const { chosen, first, fromEdit } = editWarning;
              setEditWarning(null);
              if (fromEdit) chooseVersion("optimized");
              enterEditor(chosen, first, "optimized");
            }}>그래도 편집하기</button>
          </div>
        </div>
      </div>, document.body)}
    {editMode && !optimizedEdit && createPortal(<div className={"v16-inline-floating-delete" +
      (bulkDeleteMode && bulkSelected.length ? " is-visible" : "")}
      role="region" aria-label="전체 일차 선택한 장소 삭제"
      aria-hidden={!(bulkDeleteMode && bulkSelected.length)}
      inert={!(bulkDeleteMode && bulkSelected.length)}>
      <button type="button" disabled={bulkBusy || bulkBlocked || !bulkSelected.length}
        aria-label={"전체 일차에서 선택한 장소 " + bulkSelected.length + "개 삭제하기"}
        onClick={() => setBulkConfirm(true)}>
        <Icon name="trash"/> 삭제하기 <strong>{bulkSelected.length}</strong>
      </button>
    </div>, document.body)}
    {editMode && !optimizedEdit && bulkConfirm && createPortal(<div className="v16-inline-delete-overlay">
      <div className="v16-inline-delete-dialog" role="alertdialog" aria-modal="true"
        aria-label="전체 일차 선택한 장소 삭제 확인" aria-describedby="v16-bulk-delete-message">
        <strong>선택한 장소를 일정에서 삭제할까요?</strong>
        <p id="v16-bulk-delete-message">총 {bulkSelected.length}곳이 삭제돼요. 장소 자체나 저장 폴더의 데이터는 삭제되지 않아요.</p>
        <ul className="v16-bulk-delete-days">
          {bulkGroups.map(group => <li key={group.day}><strong>{group.label}</strong><span>{group.ids.length}곳</span></li>)}
        </ul>
        <div>
          <button type="button" autoFocus onClick={() => setBulkConfirm(false)}>취소</button>
          <button type="button" disabled={bulkBusy} onClick={() => void performBulkDelete()}>삭제 확인</button>
        </div>
      </div>
    </div>, document.body)}
  </main>;
}
