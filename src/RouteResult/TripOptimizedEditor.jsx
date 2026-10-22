import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import VisitClockStepper, { stepClock } from "./VisitClockStepper";
import { placeKey } from "./tripOptimizationModel";
import { editOptimizedVisit, optimizedStay, optimizedTime,
  removeOptimizedPlaces, reorderOptimizedVisit } from "./optimizedVisitDraft";
import "./TripInlineEditor.css";
import "./TripOptimizedEditor.css";

function OptimizedVisit({ place, index, active, disabled, selected, deleteMode,
  onToggle, onSelect, onPlaceDetail, children }) {
  const id = placeKey(place);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: "optimized:" + id, disabled,
  });
  const showSummary = Boolean(place.arrivalTime || Number(place.stayDuration) > 0);
  return <article ref={setNodeRef}
    className={"v16-inline-visit v16-optimized-visit" + (isDragging ? " is-dragging" : "")}
    style={{ transform:CSS.Transform.toString(transform), transition }}>
    <div className="v16-inline-visit-row">
      <button type="button" className="v16-inline-grip" disabled={disabled}
        aria-label={place.placeName + " 순서 이동"} {...attributes} {...listeners}
        title="드래그하여 방문 순서 이동">
        <svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="currentColor"
          strokeWidth="1.8" aria-hidden="true"><path d="M4 6h12M4 10h12M4 14h12"/></svg>
      </button>
      <span className={"v16-inline-position" + (place.isFixed ? " is-fixed" : "")}>
        <span className="v16-detail-sequence">{index + 1}</span>
        {place.isFixed && <span className="v16-inline-pin-label">고정</span>}
      </span>
      <div className="v16-inline-visit-content">
        <button type="button" className="v16-inline-place-link" disabled={!place.placeId}
          onClick={() => onPlaceDetail(place)} aria-label={place.placeName + " 장소 상세 보기"}>
          {place.placeName}
        </button>
        {showSummary && <div className="v16-inline-place-meta">
          <span>방문 {place.arrivalTime || "--:--"} · 머무르기 {Number(place.stayDuration) > 0 ? place.stayDuration : "--"}분</span>
        </div>}
        {place.memo && !active && <p className="v16-detail-memo">{place.memo}</p>}
      </div>
      {deleteMode ? <button type="button" className={"v16-inline-select" + (selected ? " is-selected" : "")}
        aria-label={place.placeName + (selected ? " 삭제 선택 해제" : " 삭제 선택")}
        disabled={index === 0 || Boolean(place.isFinalAnchor)} aria-pressed={selected}
        onClick={() => onSelect(id)}>{selected ? "✓" : ""}</button>
      : <button type="button" className={"v16-inline-edit-trigger" + (active ? " is-open" : "")}
          aria-expanded={active} aria-label={place.placeName + " 최적화 방문 정보 수정"}
          onClick={() => onToggle(place)}>{active ? "닫기" : "수정"}</button>}
    </div>
    {active && !deleteMode && children}
  </article>;
}
export default function TripOptimizedEditor({ day, draft, onSave, onPlaceDetail,
  deleteMode = false, onDeleteModeChange = () => {} }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState("");
  const [hiddenHint, setHiddenHint] = useState({});
  const [selected, setSelected] = useState([]);
  useEffect(() => { if (!deleteMode) setSelected([]); }, [deleteMode]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint:{distance:6} }),
    useSensor(KeyboardSensor),
  );
  const selectedPlace = day.places.find(p => placeKey(p) === editing);
  const saveDraft = (next, message) => {
    if (next === draft) {
      setEditing(null);setForm(null);setNotice("변경한 내용이 없어요.");
      return true;
    }
    if (!next || !onSave(day.day, next)) {
      setNotice("최적화안을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
      return false;
    }
    setEditing(null); setForm(null);
    setNotice(message);
    return true;
  };
  const open = place => {
    const id = placeKey(place);
    if (editing === id) { setEditing(null); setForm(null); return; }
    setEditing(id);
    setForm({time:optimizedTime(draft,place),stay:optimizedStay(draft,place),
      memo:draft.memoOverrides?.[id] ?? place.memo ?? ""});
    setNotice("");
  };
  const save = () => {
    if (!selectedPlace || !form) return;
    const next = editOptimizedVisit(draft, selectedPlace, form);
    if (!next) { setNotice("방문 시각 또는 머무르는 시간을 확인해 주세요."); return; }
    saveDraft(next,"최적화한 일정에만 저장했어요.");
  };
  const toggleSelected = id => setSelected(current =>
    current.includes(id) ? current.filter(value=>value!==id) : [...current,id]);
  const remove = () => {
    if (!selected.length) return;
    if (saveDraft(removeOptimizedPlaces(draft,selected),"최적화한 일정에서만 장소를 삭제했어요.")) {
      setSelected([]);onDeleteModeChange(false);
    }
  };
  if (!draft) return <div className="v16-optimized-empty" role="status">
    이 일차에는 아직 최적화한 일정이 없어요. 경로 최적화에서 먼저 적용해 주세요.
  </div>;
  return <div className="v16-optimized-editor">
    {draft.stale && <p className="v16-optimized-adjusted" role="status">
      원본이 변경되었지만 저장된 최적화안은 독립적으로 편집할 수 있어요. 변경한 경로와 시간은 다시 최적화해야 반영됩니다.
    </p>}
    {!hiddenHint.info && <div className="v16-optimized-note">
      <span>이곳에서 변경하면 <strong>최적화한 일정에만 저장</strong>돼요. 원본 일정은 그대로 유지돼요.</span>
      <button type="button" aria-label="최적화 저장 안내 닫기"
        onClick={()=>setHiddenHint(v=>({...v,info:true}))}>×</button>
    </div>}
    {!hiddenHint.warning && <div className="v16-optimized-adjusted">
      <span>직접 변경한 일정이에요. 이동시간과 예약 여유는 다시 최적화하면 확인할 수 있어요.</span>
      <button type="button" aria-label="재최적화 주의 안내 닫기"
        onClick={()=>setHiddenHint(v=>({...v,warning:true}))}>×</button>
    </div>}

    <DndContext sensors={sensors} collisionDetection={closestCenter}
      onDragEnd={({active,over})=>{
        if (!active?.id?.startsWith("optimized:")||!over?.id?.startsWith("optimized:")) return;
        const from=active.id.slice(10),to=over.id.slice(10);
        if(from===to)return;
        saveDraft(reorderOptimizedVisit(draft,from,to),"최적화한 일정의 순서만 변경했어요.");
      }}>
      <SortableContext items={day.places.map(place=>"optimized:"+placeKey(place))}
        strategy={verticalListSortingStrategy}>
        <div className="v16-detail-timeline v16-inline-timeline">
          {day.places.map((place,index)=>{
            const id=placeKey(place),active=editing===id;
            const last=index===day.places.length-1;
            return <OptimizedVisit key={id} place={{...place,isFinalAnchor:last}}
              index={index} active={active} disabled={deleteMode||index===0||last}
              deleteMode={deleteMode} selected={selected.includes(id)}
              onToggle={open} onSelect={toggleSelected} onPlaceDetail={onPlaceDetail}>
              {active && form && <div className="v16-inline-panel v16-optimized-form">
                <strong>최적화한 일정의 방문 정보</strong>
                <label className="v16-optimized-form-label">방문 시각</label>
                <VisitClockStepper value={form.time} onStep={(part,dir)=>setForm(old=>({
                  ...old,time:stepClock(old.time,part,dir),
                }))}/>
                <button type="button" className="v16-optimized-clear"
                  onClick={()=>setForm(old=>({...old,time:""}))}>시간 지우기</button>
                <label className="v16-optimized-form-label" htmlFor={"v16-optimized-stay-"+id}>머무르기 (분)</label>
                <input id={"v16-optimized-stay-"+id} type="number" inputMode="numeric"
                  aria-label="최적화 머무르기 (분)" min="0" max="1440" step="1" value={form.stay}
                  onChange={event=>setForm(old=>({...old,stay:event.target.value}))}/>
                <div className="v16-optimized-presets" role="group" aria-label="최적화 머무르기 빠른 선택">
                  {[30,60,90,120].map(minutes=><button type="button" key={minutes}
                    aria-pressed={Number(form.stay)===minutes}
                    onClick={()=>setForm(old=>({...old,stay:minutes}))}>{minutes}분</button>)}
                </div>
                <label className="v16-optimized-form-label" htmlFor={"v16-optimized-memo-"+id}>메모</label>
                <textarea id={"v16-optimized-memo-"+id} aria-label="최적화 일정 메모"
                  maxLength={500} rows={2} value={form.memo}
                  onChange={event=>setForm(old=>({...old,memo:event.target.value}))}/>
                <div className="v16-optimized-actions">
                  <button type="button" onClick={()=>{setEditing(null);setForm(null);}}>취소</button>
                  <button type="button" onClick={save}>저장</button>
                </div>
              </div>}
            </OptimizedVisit>;
          })}
        </div>
      </SortableContext>
    </DndContext>
    {notice && <p className="v16-optimized-feedback" role="status">{notice}</p>}
    {createPortal(<div className={"v16-inline-floating-delete" +
        (deleteMode && selected.length ? " is-visible" : "")}
        role="region" aria-label={day.label + " 최적화안 선택 장소 삭제"}
        aria-hidden={!(deleteMode && selected.length)}
        inert={!(deleteMode && selected.length)}>
      <button type="button" disabled={!selected.length || !deleteMode}
        aria-label={day.label + " 최적화 장소 " + selected.length + "개 삭제하기"}
        onClick={remove}>삭제하기 <strong>{selected.length}</strong></button>
    </div>, document.body)}
  </div>;
}
