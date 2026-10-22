import React, { useEffect, useRef, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";
import { getTripPlacesApi, deleteTripDayPlacesApi, updateTripPlaceManualOrderApi,
  updateTripPlaceMemoApi, updateTripPlaceScheduleApi } from "../api/tripApi";
import { uncertainMutation } from "../utils/useMutationTask";
import { defaultStay, placeKey } from "./tripOptimizationModel";
import VisitClockStepper, { stepClock } from "./VisitClockStepper";
import "./TripInlineEditor.css";

const timeLabel = raw => String(raw || "").slice(0, 5);
const addMinutes = (value, amount) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value || "");
  if (!match) return addMinutes("00:00", amount);
  const total = (Number(match[1]) * 60 + Number(match[2]) + amount + 1440) % 1440;
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" +
    String(total % 60).padStart(2, "0");
};
const initialDraft = p => ({ time: timeLabel(p?.arrivalTime), fixed: Boolean(p?.isFixed), stay: defaultStay(p), memo: p?.memo || "" });


function SortableVisit({ place, index, open, onToggle, onPlaceDetail, children, disabled, deleteMode, checked, onSelect, selectionDisabled }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: "edit:" + placeKey(place), disabled,
  });
  return <article ref={setNodeRef} className={"v16-inline-visit" + (isDragging ? " is-dragging" : "")}
    style={{ transform: CSS.Transform.toString(transform), transition }}>
    <div className="v16-inline-visit-row">
      <button type="button" className="v16-inline-grip" disabled={disabled}
        aria-label={place.placeName + " 순서 이동"} {...attributes} {...listeners} title="드래그하여 방문 순서 이동">
        <svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6h12M4 10h12M4 14h12"/></svg>
      </button>
      <span className={"v16-inline-position" + (place.isFixed ? " is-fixed" : "")}>
        <span className="v16-detail-sequence">{index + 1}</span>
        {place.isFixed && <span className="v16-inline-pin-label">고정</span>}
      </span>
      <div className="v16-inline-visit-content">
        <button type="button" className="v16-inline-place-link" disabled={!place.placeId}
          onClick={() => onPlaceDetail(place)} aria-label={place.placeName + " 장소 상세 보기"}>
          {place.placeName}
          {place.placeId && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>}
        </button>
        {(place.arrivalTime || Number(place.stayDuration) > 0) && <div className="v16-inline-place-meta">
          <span>방문 {place.arrivalTime ? timeLabel(place.arrivalTime) : "--:--"}</span>
          <span aria-hidden="true">·</span>
          <span>머무르기 {Number(place.stayDuration) > 0 ? place.stayDuration : "--"}분</span>
        </div>}
        {place.memo && !open && <p className="v16-detail-memo">{place.memo}</p>}
      </div>
      {deleteMode ? <button type="button" className={"v16-inline-select" + (checked ? " is-selected" : "")}
        aria-label={place.placeName + (checked ? " 삭제 선택 해제" : " 삭제 선택")}
        aria-pressed={checked} disabled={selectionDisabled} onClick={() => onSelect(placeKey(place))}>
        {checked ? "✓" : ""}
      </button> : <button type="button" className={"v16-inline-edit-trigger" + (open ? " is-open" : "")}
        aria-label={place.placeName + (open ? " 수정 닫기" : " 방문 정보 수정")} aria-expanded={open}
        onClick={() => onToggle(placeKey(place))} title={open ? "수정 닫기" : "방문 정보 수정"}>
        {open ? "닫기" : "수정"}
      </button>
      }
    </div>
    {open && !deleteMode && children}
  </article>;
}

export default function TripInlineEditor({
  tripId, day, onRefresh, onPlaceDetail, onAddPlaces, autoOpenFirst = false, autoOpenPlace = null,
  deleteMode = false, onFinishDelete = () => {},
  externalDeleteSelection = null, onExternalDeleteSelection = null, externalDeleteBusy = false,
}) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(initialDraft(null));
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [notice, setNotice] = useState("");
  const [orderDraft, setOrderDraft] = useState(null);
  const [deleteSelected, setDeleteSelected] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const openedFirst = useRef(null);
  const mutationLock = useRef(false);
  const places = day.places;
  const controlledDelete = Array.isArray(externalDeleteSelection) && typeof onExternalDeleteSelection === "function";
  const activeDeleteSelection = controlledDelete ? externalDeleteSelection : deleteSelected;
  const ordered = orderDraft && orderDraft.length === places.length &&
    orderDraft.every(id => places.some(p => placeKey(p) === id))
    ? orderDraft.map(id => places.find(p => placeKey(p) === id)) : places;
  const selected = places.find(p => placeKey(p) === editing);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor));

  useEffect(() => {
    // Keep local drag preview until the server emits the new canonical order.
    setOrderDraft(null);
  }, [places.map(p => placeKey(p) + ":" + p.visitOrder).join("|")]);

  useEffect(() => {
    if (deleteMode || openedFirst.current !== null) return;
    const target = autoOpenPlace == null ? null :
      places.find(place => placeKey(place) === String(autoOpenPlace));
    const open = target || (autoOpenFirst ? places[0] : null);
    if (!open) return;
    const id = placeKey(open);
    setEditing(id);
    setDraft(initialDraft(open));
    openedFirst.current = id;
  }, [autoOpenFirst, autoOpenPlace, deleteMode, places]);
  useEffect(() => {
    setDeleteSelected([]);
    setConfirmDelete(false);
    if (deleteMode) setEditing(null);
  }, [deleteMode]);
  const toggleDeleteSelection = id => {
    if (busy || blocked || !deleteMode) return;
    setDeleteSelected(current => current.includes(id)
      ? current.filter(item => item !== id) : [...current, id]);
  };
  const deleteSelectedPlaces = () => {
    if (!deleteMode || !deleteSelected.length || busy || blocked) return;
    const ids = deleteSelected.map(Number);
    setConfirmDelete(false);
    void execute(async () => {
      const remaining = await deleteTripDayPlacesApi({ tripId, day: day.day, tripPlaceIds: ids });
      if (remaining.some(p => ids.includes(Number(p.tripPlaceId)))) {
        throw new Error("삭제 응답을 확인하지 못했어요.");
      }
    }, "선택한 장소를 삭제했어요.").then(success => {
      if (success) {
        setDeleteSelected([]);
        setOrderDraft(null);
        onFinishDelete();
      }
    });
  };
  const toggleEdit = id => {
    if (busy || blocked || deleteMode) return;
    if (editing === id) { setEditing(null); return; }
    const entry = places.find(p => placeKey(p) === id);
    setDraft(initialDraft(entry));
    setEditing(id);
    setNotice("");
  };
  const execute = async (operation, success, { keepEditor = false } = {}) => {
    if (mutationLock.current || blocked) return false;
    mutationLock.current = true; setBusy(true); setNotice("");
    let wrote = false;
    try {
      await operation();
      wrote = true;
      await onRefresh();
      if (!keepEditor) setEditing(null);
      setNotice(success);
      return true;
    } catch (error) {
      if (wrote || uncertainMutation(error)) {
        setBlocked(true);
        setNotice("저장 결과를 확인하지 못했어요. 중복 실행하지 않고 다시 조회해 주세요.");
      } else setNotice(error?.message || "저장할 수 없어요. 다시 시도해 주세요.");
      return false;
    } finally {
      mutationLock.current = false; setBusy(false);
    }
  };
  const saveVisit = () => {
    if (!selected) return;
    if (draft.fixed && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft.time)) {
      setNotice("예약 시간으로 고정하려면 방문 시각을 입력해 주세요."); return;
    }
    const stay = Number(draft.stay);
    if (!Number.isSafeInteger(stay) || stay < 1 || stay > 1440) {
      setNotice("머무르는 시간은 1~1440분 사이로 입력해 주세요."); return;
    }
    const changedStay = stay !== defaultStay(selected);
    const changedTime = draft.time !== timeLabel(selected.arrivalTime);
    const changedSchedule = draft.fixed !== Boolean(selected.isFixed) || changedTime;
    const changedMemo = draft.memo !== (selected.memo || "");
    if (!changedSchedule && !changedStay && !changedMemo) { setEditing(null); return; }
    const visitId = placeKey(selected);
    void execute(async () => {
      if (changedSchedule || changedStay) await updateTripPlaceScheduleApi({
        tripId, day: day.day, tripPlaceId: visitId,
        schedule: {
          ...(changedSchedule ? { fixed: draft.fixed, ...(draft.time ?
            { arrivalTime: draft.time } : { clearArrivalTime: true }),
            reorderByVisitTime: false } : {}),
          ...(changedStay ? { stayDuration: stay } : {}),
        },
      });
      if (changedMemo) await updateTripPlaceMemoApi({
        tripId, day: day.day, tripPlaceId: visitId, memo: draft.memo,
      });
    }, "방문 정보를 저장했어요.");
  };
  const moveVisit = (source, target) => {
    if (busy || blocked || deleteMode || source === target) return;
    const ids = ordered.map(placeKey);
    const from = ids.indexOf(source), to = ids.indexOf(target);
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(ids, from, to);
    setOrderDraft(reordered);
    void execute(async () => {
      await updateTripPlaceManualOrderApi({ tripId, day: day.day, tripPlaceIds: reordered });
      const server = await getTripPlacesApi(tripId);
      const result = server.filter(p => Number(p.day) === day.day)
        .sort((a, b) => a.visitOrder - b.visitOrder).map(placeKey);
      if (JSON.stringify(result) !== JSON.stringify(reordered)) {
        throw new Error("저장된 순서를 다시 확인해 주세요.");
      }
    }, "방문 순서를 변경했어요.", { keepEditor: true }).then(success => {
      if (!success) setOrderDraft(null);
    });
  };

  return <div className="v16-inline-editor">
    <DndContext sensors={sensors} collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (active?.id?.startsWith("edit:") && over?.id?.startsWith("edit:")) {
          moveVisit(active.id.slice(5), over.id.slice(5));
        }
      }}>
      <SortableContext items={ordered.map(p => "edit:" + placeKey(p))} strategy={verticalListSortingStrategy}>
        <div className="v16-detail-timeline v16-inline-timeline">
          {ordered.map((place, index) =>
            <SortableVisit key={placeKey(place)} place={place} index={index}
              open={editing === placeKey(place)} onToggle={toggleEdit}
              onPlaceDetail={onPlaceDetail} disabled={busy || blocked || deleteMode || externalDeleteBusy}
              deleteMode={deleteMode} checked={activeDeleteSelection.includes(placeKey(place))}
              selectionDisabled={busy || blocked || externalDeleteBusy}
              onSelect={controlledDelete ? onExternalDeleteSelection : toggleDeleteSelection}>
              <div className="v16-inline-panel">
<div className="v16-inline-fields">
                  <div className="v16-inline-time-group">
                    <span className="v16-inline-clock-label">방문 시각</span>
                    <VisitClockStepper value={draft.time} disabled={busy || blocked}
                      onStep={(part, direction) => setDraft(d => ({
                        ...d, time: stepClock(d.time, part, direction),
                      }))}/>
                    <div className="v16-inline-time-quick">
                      {[
                        ["-1시간", -60], ["-30분", -30], ["+30분", 30], ["+1시간", 60],
                      ].map(([label, amount]) => <button key={label} type="button"
                        disabled={busy || blocked} onClick={() =>
                          setDraft(d => ({ ...d, time:addMinutes(d.time, amount) }))}>{label}</button>)}
                      <button type="button" className="v16-inline-time-clear"
                        disabled={busy || blocked || !draft.time} onClick={() =>
                          setDraft(d => ({ ...d, time:"", fixed:false }))}>시간 지우기</button>
                    </div>
                  </div>
                  <div className="v16-inline-fixed-setting">
                    <label className="v16-inline-check">
                      <input type="checkbox" aria-label="이 시간에 꼭 방문" checked={draft.fixed}
                        disabled={busy || blocked}
                        onChange={event => setDraft(d => ({ ...d, fixed:event.target.checked }))}/>
                      <span>이 시간에 꼭 방문</span>
                    </label>
                    <span className="v16-inline-help-wrap">
                      <button type="button" aria-label="고정 방문 시간 설명" className="v16-inline-help-trigger"
                        aria-describedby={"v16-fixed-help-" + placeKey(place)}>?</button>
                      <span id={"v16-fixed-help-" + placeKey(place)} className="v16-inline-help-tooltip"
                        role="tooltip">이 시간에 꼭 방문을 체크하면 꼼꼼한 최적화에서 예약 시각을 고려해 경로를 정하는 데 도움이 돼요! 시작 장소도 고정할 수 있어요.</span>
                    </span>
                  </div>
                </div>
                <div className="v16-inline-stay">
                  <label htmlFor={"v16-inline-stay-" + placeKey(place)}>머무르기 <span>분 단위 · 기본 60분</span></label>
                  <div className="v16-inline-stay-controls">
                    <input id={"v16-inline-stay-" + placeKey(place)} aria-label="머무르기 (분)"
                      type="number" inputMode="numeric" min="1" max="1440" step="1"
                      value={draft.stay} disabled={busy || blocked}
                      onChange={event => setDraft(current => ({...current,stay:event.target.value}))}/>
                    <div className="v16-inline-stay-presets" role="group" aria-label="머무르기 빠른 선택">
                      {[30,60,90,120].map(minutes => <button key={minutes} type="button"
                        disabled={busy || blocked} aria-pressed={Number(draft.stay) === minutes}
                        onClick={() => setDraft(current => ({...current,stay:minutes}))}>
                        {minutes}분
                      </button>)}
                    </div>
                  </div>
                </div>
                <label className="v16-inline-memo-field">메모
                  <textarea rows={2} maxLength={500} value={draft.memo} disabled={busy || blocked}
                    placeholder="간단한 메모 (선택)" onChange={event => setDraft(d => ({ ...d, memo: event.target.value }))}/>
                </label>
                <div className="v16-inline-panel-actions">
                  <button type="button" disabled={busy || blocked} onClick={() => setEditing(null)}>취소</button>
                  <button type="button" disabled={busy || blocked} onClick={saveVisit}>{busy ? "저장 중" : "저장"}</button>
                </div>
              </div>
            </SortableVisit>)}
        </div>
      </SortableContext>
    </DndContext>
    {!places.length && <div className="v16-detail-empty"><strong>아직 추가된 장소가 없어요.</strong>
      <button type="button" onClick={onAddPlaces}>장소 추가하기</button></div>}
    {notice && <p className="v16-inline-notice" role={blocked ? "alert" : "status"}>{notice}</p>}
    {blocked && <button type="button" className="v16-inline-refresh" onClick={() => {
      setBlocked(false); setOrderDraft(null); setNotice(""); void onRefresh();
    }}>일정 다시 조회</button>}
    <button type="button" className="v16-inline-add-bottom" disabled={busy || blocked || deleteMode}
      onClick={onAddPlaces}>＋ 장소 추가</button>
    {!controlledDelete && createPortal(<div className={"v16-inline-floating-delete" + (
      deleteMode && deleteSelected.length > 0 ? " is-visible" : "")}
      role="region" aria-label={day.day + "일차 선택한 장소 삭제"}
      aria-hidden={!(deleteMode && deleteSelected.length)} inert={!(deleteMode && deleteSelected.length)}>
      <button type="button" disabled={busy || blocked || !deleteSelected.length}
        aria-label={"선택한 장소 " + deleteSelected.length + "개 삭제하기"}
        onClick={() => setConfirmDelete(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          width="19" height="19" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
        삭제하기 <strong>{deleteSelected.length}</strong>
      </button>
    </div>, document.body)}
    {!controlledDelete && confirmDelete && createPortal(<div className="v16-inline-delete-overlay">
      <div className="v16-inline-delete-dialog" role="alertdialog" aria-modal="true"
        aria-label="선택한 일정 장소 삭제 확인" aria-describedby="v16-inline-delete-message">
        <strong>선택한 장소를 삭제할까요?</strong>
        <p id="v16-inline-delete-message">{day.day}일차에서 {deleteSelected.length}개 장소가 삭제됩니다. 장소 자체나 저장 폴더의 데이터는 삭제되지 않아요.</p>
        <div>
          <button type="button" autoFocus onClick={() => setConfirmDelete(false)}>취소</button>
          <button type="button" onClick={deleteSelectedPlaces}>삭제 확인</button>
        </div>
      </div>
    </div>, document.body)}
  </div>;
}
