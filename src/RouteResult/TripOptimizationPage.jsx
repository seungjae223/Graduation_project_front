import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import useTripResult from "./useTripResult";
import useSessionKey from "../utils/useSessionKey";
import { readDayTimes, saveDayTimes } from "./tripDayTimePreferences";
import { tripDays } from "./tripDetailModel";
import { clockLabelWithDay, defaultStay, edgeKey, evaluatePlan, initializeOptimization,
  segmentBreakdown,
  placeKey, quickOrder, reorderSegmentPlace, routeMetrics, sourceSignature, travelTime } from "./tripOptimizationModel";
import { saveOptimizedDay } from "./tripOptimizationVersionStore";
import { saveTripDisplayPreferences } from "./tripDetailPreferenceStore";
import VisitClockStepper, { stepClock } from "./VisitClockStepper";
import "./TripOptimizationPage.css";

const num = (raw, max, min = 1) => {
  const n = Number(raw);
  return raw !== "" && Number.isInteger(n) && n >= min && n <= max ? n : null;
};
function MinuteInput({ value, onCommit, label, min = 1, max = 1440 }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const save = () => {
    const next = num(draft, max, min);
    if (next == null) setDraft(String(value));
    else onCommit(next);
  };
  return <label className="v165-minute">
    <span className="v165-sr-only">{label}</span>
    <input type="number" min={min} max={max} aria-label={label} value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={save} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}/>
    <span>분</span>
  </label>;
}
function SortablePlace({ place, number, stay, editing, onToggle, onStayChange,
  segmentIndex, segmentCount, segmentLength, onMoveWithin, onMoveSegment }) {
  const id = placeKey(place);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: "spot:" + id });
  return <div ref={setNodeRef} className={"v165-place" + (isDragging ? " is-dragging" : "")}
    style={{ transform: CSS.Transform.toString(transform), transition }}>
    <div className="v165-place-line">
      <button type="button" className="v165-grip" {...attributes} {...listeners}
        aria-label={place.placeName + " 드래그하여 순서 또는 구간 이동"} title="순서·구간 이동">☰</button>
      <span className="v165-position">{number}</span>
      <div className="v165-place-name"><strong>{place.placeName}</strong><small>예상 머무르기 {stay}분</small></div>
      <button className="v165-small" type="button" aria-expanded={editing} onClick={() => onToggle(editing ? null : id)}>
        {editing ? "닫기" : "수정"}</button>
    </div>
    {editing && <div className="v165-place-editor">
      <div className="v165-arrange">
        <strong>순서와 구간</strong>
        <div className="v165-arrange-actions">
          <button type="button" aria-label={place.placeName + " 순서를 앞으로"}
            disabled={number <= 1} onClick={() => onMoveWithin(id, -1)}>↑ 앞</button>
          <button type="button" aria-label={place.placeName + " 순서를 뒤로"}
            disabled={number >= segmentLength} onClick={() => onMoveWithin(id, 1)}>↓ 뒤</button>
          <label>배치 구간 <select aria-label={place.placeName + " 배치 구간"} value={segmentIndex}
            onChange={event => onMoveSegment(id, Number(event.target.value))}>
            {Array.from({ length: segmentCount }, (_, i) =>
              <option value={i} key={i}>구간 {String.fromCharCode(65 + i)}</option>)}
          </select></label>
        </div>
      </div>
      <div className="v165-label">예상 머무르기 <span>기본 60분</span></div>
      <div className="v165-chips">
        {[30, 60, 90, 120].map(value => <button key={value} type="button"
          aria-pressed={stay === value} onClick={() => onStayChange(id, value)}>{value}분</button>)}
      </div>
      <div className="v165-editline"><span>직접 입력</span>
        <MinuteInput key={id} value={stay} label={place.placeName + " 머무르기"} onCommit={v => onStayChange(id, v)}/>
      </div>
      <p>이 장소에 머무는 시간을 수정하면 다음 예약까지의 예상 여유를 다시 계산해요.</p>
    </div>}
  </div>;
}
function Segment({ segment, index, byId, stays, overrides, evaluation, expanded, onExpand,
  editingPlace, onEditingPlace, onStayChange, onTravelChange, onMoveWithin, onMoveSegment,
  segmentCount, movedIndex, startTime, endTime, onEditReservation }) {
  const { setNodeRef, isOver } = useDroppable({ id: "zone:" + index });
  const ids = [segment.from, ...segment.items, segment.to];
  const from = byId[segment.from], to = byId[segment.to];
  const breakdown = segmentBreakdown({ segment, index, places: Object.values(byId),
    stays, travelOverrides: overrides, plan: evaluation, startTime, endTime });
  const firstHop = ids[1], lastHop = ids[ids.length - 1];
  const departureLeg = evaluation?.rows.find(row => row.type === "travel" &&
    row.fromId === segment.from && row.toId === firstHop);
  const arrivalLeg = evaluation?.rows.find(row => row.type === "travel" && row.toId === lastHop);
  const lateness = breakdown?.actualLate || 0;
  const warning = lateness > 0;
  return <section ref={setNodeRef}
    className={"v165-segment" + (warning ? " is-warning" : "") + (isOver ? " is-drop-target" : "")}
    aria-label={"구간 " + (index + 1)}>
    <h3>구간 {String.fromCharCode(65 + index)}</h3>
    <div className="v165-pinpoints"><span>{from?.placeName}</span><span aria-hidden="true">→</span><span>{to?.placeName}</span></div>
    <div className="v165-segment-timing">
      <div className="v165-segment-endpoint">
        <span className="v165-endpoint-label">출발점 · {from?.placeName}</span>
        <div className="v165-endpoint-duration"><span>머무르기</span>
          <MinuteInput value={stays[segment.from] ?? (index === 0 ? 0 : defaultStay(from))}
            min={0} label={from?.placeName + " 출발점 머무르기"}
            onCommit={v => onStayChange(segment.from,v)}/>
        </div>
      </div>
      <div className="v165-segment-endpoint">
        <span className="v165-endpoint-label">도착점 · {to?.placeName}</span>
        <div className="v165-endpoint-duration"><span>머무르기</span>
          <MinuteInput value={stays[segment.to] ?? (index === segmentCount-1 ? 0 : defaultStay(to))}
            min={0} label={to?.placeName + " 도착점 머무르기"}
            onCommit={v => onStayChange(segment.to,v)}/>
        </div>
      </div>
      <div className="v165-segment-prediction" role="group" aria-label={"구간 " + String.fromCharCode(65 + index) + " 예상 시간"}>
        <div><span>예상 출발</span><strong>{clockLabelWithDay(departureLeg?.time)}</strong></div>
        <span aria-hidden="true">→</span>
        <div><span>예상 도착</span><strong>{clockLabelWithDay(arrivalLeg?.end)}</strong></div>
      </div>
      {index === segmentCount - 1 && <p className="v165-segment-note">마지막 장소에서 머무르는 시간은 도착 이후에 계산해요.</p>}
      {to?.isFixed && <div className="v165-booking-fixed">
        <span className="v165-booking-warning-symbol" aria-hidden="true">!</span>
        <span className="v165-booking-message">{to.placeName} 예약 시간 {to.arrivalTime?.slice(0,5)}은 변경되지 않아요.</span>
        <button type="button" className="v165-booking-edit"
          aria-label={to.placeName + " 예약 시간 수정하러 가기"}
          onClick={() => onEditReservation(placeKey(to))}>수정하러 가기</button>
      </div>}
    </div>
    <SortableContext items={segment.items.map(id => "spot:" + id)} strategy={verticalListSortingStrategy}>
      {segment.items.length ? segment.items.map((id, i) => <SortablePlace
        key={id} place={byId[id]} number={i + 1}
        stay={stays[id] ?? defaultStay(byId[id])} editing={editingPlace === id}
        onToggle={onEditingPlace} onStayChange={onStayChange}
        segmentIndex={index} segmentCount={segmentCount} segmentLength={segment.items.length}
        onMoveWithin={onMoveWithin} onMoveSegment={onMoveSegment}/>)
        : <p className="v165-empty">배치된 일반 장소가 없어요. 이곳에 장소를 드래그할 수 있어요.</p>}
    </SortableContext>
    <div className="v165-segment-summary">
      <span className="v165-travel-summary">예상 이동 {breakdown?.travelMinutes ?? "—"}분
        <span className="v165-travel-help">
          <button type="button" className="v165-travel-help-trigger"
            aria-label={"구간 " + String.fromCharCode(65 + index) + " 예상 이동시간 안내"}
            aria-describedby={"v165-travel-help-" + index}>?</button>
          <span id={"v165-travel-help-" + index} role="tooltip" className="v165-travel-tooltip">
            실제 이동 시간과 다를 수 있으니, 직접 찾아서 넣으면 더 완벽한 계획을 짤 수 있어요
          </span>
        </span>
      </span>
      <button className="v165-link" type="button" aria-expanded={expanded}
        onClick={() => onExpand(expanded ? null : index)}>
        {expanded ? "시간 수정 닫기" : "이동 시간 수정"}
      </button>
    </div>
    {expanded && <div className="v165-segment-travel">
      <p>장소 사이의 예상 이동 시간을 직접 바꿀 수 있어요.</p>
      {ids.slice(1).map((id, i) => {
        const source = byId[ids[i]], dest = byId[id], key = edgeKey(source, dest);
        return <div className="v165-editline" key={key}>
          <span>{source.placeName} → {dest.placeName}</span>
          <MinuteInput key={key} max={720} value={travelTime(source, dest, overrides) ?? 0}
            label={source.placeName + "에서 " + dest.placeName + " 이동 시간"}
            onCommit={v => onTravelChange(key, v)}/>
        </div>;
      })}
    </div>}
    {warning && <p className="v165-warning" role="status">
      <strong>⚠ {to.placeName} 예약에 약 {lateness}분 늦을 수 있어요.</strong>
      {" "}앞 장소에서 머무르는 시간이나 이동 순서를 조정해 보세요.
    </p>}
    {movedIndex === index && <p className="v165-moved">ⓘ 다른 구간에서 옮긴 장소가 있어요. 이동 시간이 더 늘어날 수 있어요.</p>}
  </section>;
}
function PreviewRow({ row }) {
  return <div className={"v165-time-row type-" + row.type}>
    <span className="v165-clock">{clockLabelWithDay(row.time)}</span>
    <div><strong>{row.type === "travel" ? row.from + " → " + row.to :
      row.type === "wait" ? row.name + " 예약 전 대기" : row.name}</strong>
      <small>{row.type === "travel" ? `이동 ${row.minutes}분 · ${clockLabelWithDay(row.end)} 도착` :
        row.type === "wait" ? `대기 ${row.minutes}분` :
          row.type === "fixed" ? `예약 시간 · 머무르기 ${row.minutes}분` :
            row.type === "place" ? `머무르기 ${row.minutes}분 · ${clockLabelWithDay(row.end)} 출발` :
              row.type === "end" ? (row.minutes > 0 ? "마지막 장소 도착 · 이후 머무르기 " + row.minutes + "분" : "마지막 장소 도착") : "여행 시작"}</small>
    </div>
  </div>;
}
export default function TripOptimizationPage() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const navigate = useNavigate();
  const account = useSessionKey();
  const result = useTripResult(id);
  const days = useMemo(() => tripDays(result.trip, result.places, {}), [result.trip, result.places]);
  const [day, setDay] = useState(() => Math.max(1, Number(params.get("day")) || 1));
  const [mode, setMode] = useState("quick");
  const [stage, setStage] = useState("setup");
  const [previewMode, setPreviewMode] = useState("after");
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("");
  const timeRef = useRef({ startTime:"00:00",endTime:"" });
  const [segments, setSegments] = useState([]);
  const [stays, setStays] = useState({});
  const [overrides, setOverrides] = useState({});
  const [editing, setEditing] = useState(null);
  const [travelZone, setTravelZone] = useState(null);
  const [movedIndex, setMovedIndex] = useState(null);
  const [notice, setNotice] = useState("");
  const [confirmApply, setConfirmApply] = useState(false);
  const places = useMemo(() => result.places.filter(p => Number(p.day) === day)
    .sort((a, b) => a.visitOrder - b.visitOrder), [result.places, day]);
  const signature = useMemo(() => sourceSignature(places), [places]);
  const byId = useMemo(() => Object.fromEntries(places.map(p => [placeKey(p), p])), [places]);
  useEffect(() => {
    if (result.status !== "success") return;
    const saved = readDayTimes(id, account, day);
    const begin = places.find(p => p.isStartPoint) || places[0];
    const final = places[places.length - 1];
    const preferredStart = saved.startTime || String(begin?.arrivalTime || "").slice(0, 5) || "00:00";
    const preferredEnd = saved.endTime || String(final?.arrivalTime || "").slice(0, 5) || "";
    timeRef.current = {startTime:preferredStart,endTime:preferredEnd};
    setStartTime(preferredStart); setEndTime(preferredEnd);
    setSegments(initializeOptimization(places, { startTime: preferredStart, endTime: preferredEnd }).segments);
    setStays({}); setOverrides({}); setEditing(null); setTravelZone(null); setMovedIndex(null);
    setStage("setup"); setNotice(""); setConfirmApply(false);
    // Only reset on a different day or actual server source revision, not local edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, signature, result.status, id, account]);
  const initial = useMemo(() => initializeOptimization(places, { startTime, endTime }), [places, startTime, endTime]);
  const quickRoute = useMemo(() => quickOrder(places), [places]);
  const order = useMemo(() => mode === "quick" ? quickRoute :
    segments.length ? [segments[0].from, ...segments.flatMap(s => [...s.items, s.to])] : null,
  [mode, quickRoute, segments]);
  const plan = order ? evaluatePlan({
    places, segments, order, stays, travelOverrides: overrides, startTime, endTime,
    respectFixed: mode === "careful",
  }) : null;
  const originalOrder = useMemo(() =>
    places.map(placeKey), [places]);
  const beforeMetrics = useMemo(() => routeMetrics(places, originalOrder), [places, originalOrder]);
  const afterMetrics = useMemo(() => routeMetrics(places, order, overrides), [places, order, overrides]);
  const distanceDifference = beforeMetrics && afterMetrics ?
    Math.round((beforeMetrics.distanceKm - afterMetrics.distanceKm) * 10) / 10 : null;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor));
  const handleDragEnd = ({ active, over }) => {
    if (!over || !active.id.startsWith("spot:")) return;
    const moving = active.id.slice(5);
    let targetZone = -1, beforeId = null;
    if (over.id.startsWith("zone:")) targetZone = Number(over.id.slice(5));
    else if (over.id.startsWith("spot:")) {
      beforeId = over.id.slice(5);
      targetZone = segments.findIndex(s => s.items.includes(beforeId));
    }
    const from = segments.findIndex(s => s.items.includes(moving));
    if (targetZone < 0 || from < 0 || (beforeId === moving)) return;
    setSegments(current => reorderSegmentPlace(current, moving, targetZone, beforeId));
    setMovedIndex(from === targetZone ? null : targetZone);
  };
  const updateDayTime = (field, part, direction) => {
    const next=stepClock(timeRef.current[field],part,direction);
    timeRef.current={...timeRef.current,[field]:next};
    if(field==="startTime")setStartTime(next); else setEndTime(next);
    saveDayTimes(id,account,day,timeRef.current);
  };
  const moveWithin = (visitId, direction) => {
    setSegments(current => {
      const next = current.map(segment => ({ ...segment, items: [...segment.items] }));
      const target = next.find(segment => segment.items.includes(visitId));
      if (!target) return current;
      const index = target.items.indexOf(visitId), newIndex = index + direction;
      if (newIndex < 0 || newIndex >= target.items.length) return current;
      [target.items[index], target.items[newIndex]] = [target.items[newIndex], target.items[index]];
      return next;
    });
    setMovedIndex(null);
  };
  const moveSegment = (visitId, destination) => {
    setSegments(current => reorderSegmentPlace(current, visitId, destination));
    setMovedIndex(destination);
  };
  const detailHref = "/route-result?id=" + encodeURIComponent(id || "");
  const editReservation = tripPlaceId => {
    navigate(detailHref + "&edit=1&day=" + encodeURIComponent(day) +
      "&place=" + encodeURIComponent(tripPlaceId));
  };
  if (result.status === "loading") return <main className="v165-page"><p role="status">여행을 불러오는 중...</p></main>;
  if (result.status !== "success" || !days.length) return <main className="v165-page">
    <p role="alert">{result.error || "일정을 확인할 수 없어요."}</p>
    <button type="button" onClick={() => navigate("/schedule")}>일정 목록으로</button>
  </main>;
  const canPlan = places.length >= 2 && initial.error === "";
  const before = [...places].sort((a, b) => a.visitOrder - b.visitOrder);
  const warnings = plan?.warnings || [];
  const skippedReservations = mode === "quick" && places.some(place => place.isFixed);
  const requiresConfirmation = warnings.length > 0 || skippedReservations;
  const save = () => {
    if (!plan || !order || !canPlan || plan.rows.filter(row => row.id).length !== places.length) return;
    if (!saveOptimizedDay(id, account, result.places, day,
      { order, rows: plan.rows, warnings: plan.warnings, mode, stayOverrides: stays })) {
      setNotice("최적화안을 이 브라우저에 보관하지 못했어요. 저장 공간을 확인해 주세요.");
      return;
    }
    // Applying the plan is an explicit choice to view the optimized itinerary.
    saveTripDisplayPreferences(id, account, { version: "optimized" });
    setConfirmApply(false);
    navigate(detailHref);
  };
  return <main className="v165-page">
    <div className="v165-journey">
      <strong className="v165-journey-title">{result.trip.title}</strong>
      <div className="v165-day-tabs" role="group" aria-label="최적화 날짜 선택">
        {days.map(d => <button key={d.day} type="button" aria-pressed={day === d.day}
          onClick={() => setDay(d.day)}>{d.label}<small>{d.dateLabel}</small></button>)}
      </div>
    </div>
    {stage === "setup" ? <>
      <div className="v165-mode-tabs" role="group" aria-label="최적화 방식">
        <button type="button" aria-pressed={mode === "quick"} onClick={() => setMode("quick")}>
          <strong><svg className="v165-mode-icon is-quick" viewBox="0 0 24 24" aria-hidden="true"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m13 2-9 12h7l-1 8 10-12h-7z"/></svg> 빠르게 정렬</strong><small>출발·도착만 고정하고 빠르게 정렬</small></button>
        <button type="button" aria-pressed={mode === "careful"} onClick={() => setMode("careful")}>
          <strong><svg className="v165-mode-icon is-careful" viewBox="0 0 24 24" aria-hidden="true"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> 꼼꼼한 최적화</strong><small>예약 기준점과 시간까지 세세하게 고려하여 최적화</small></button>
      </div>
      {mode === "careful" && canPlan && <div className="v165-ai-ready" role="status">
        <strong>NomanGo가 자동 계산을 끝내 먼저 효율적으로 장소를 배치했어요!</strong>
        <small>좌표와 방문 조건을 기반으로 계산한 예상 동선이에요.</small>
      </div>}
      <div className="v165-time-fields">
        <div className="v165-time-field">
          <strong>출발하고 싶은 시간</strong>
          <span className="v165-time-place">출발지 · {(places.find(p=>p.isStartPoint) || places[0])?.placeName || "미정"}</span>
          <VisitClockStepper label="출발하고 싶은 시간" value={startTime}
            onStep={(part,direction)=>updateDayTime("startTime",part,direction)}/>
        </div>
        <div className="v165-time-field">
          <strong>도착하고 싶은 시간</strong>
          <span className="v165-time-place">도착지 · {(byId[initial.segments[initial.segments.length-1]?.to] || places[places.length-1])?.placeName || "미정"}</span>
          <VisitClockStepper label="도착하고 싶은 시간" value={endTime || "00:00"}
            onStep={(part,direction)=>updateDayTime("endTime",part,direction)}/>
          {!endTime && <span className="v165-end-notice">기본 표시 시간이며, 변경하면 목표에 반영돼요.</span>}
        </div>
      </div>
      {!canPlan ? <div className="v165-error" role="status">{initial.error || "일정에 장소를 추가해 주세요."}</div> :
        mode === "careful" ? <>
          <div className="v165-caption"><h2>시간 기준 구간</h2>
            <p className="v165-next-step">이제 조금만 더 설정하면 NomanGo가 완성해드려요!</p>
            <small>방문 순서를 자동 계산했어요. ☰ 아이콘을 끌어 같은 구간에서 순서를 바꾸거나 다른 구간으로 옮길 수 있어요.</small>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {segments.map((s, i) => <Segment key={s.id} segment={s} index={i} byId={byId}
              stays={stays} overrides={overrides} evaluation={plan} editingPlace={editing}
              onEditingPlace={setEditing} onStayChange={(id, v) => setStays(prev => ({ ...prev, [id]: v }))}
              expanded={travelZone === i} onExpand={setTravelZone} movedIndex={movedIndex}
              onTravelChange={(key, v) => setOverrides(prev => ({ ...prev, [key]: v }))}
              onMoveWithin={moveWithin} onMoveSegment={moveSegment}
              startTime={startTime} endTime={endTime} segmentCount={segments.length}
              onEditReservation={editReservation}/>)}
          </DndContext>
        </> : <div className="v165-card"><h2>빠르게 정렬</h2>
          <p>시작 장소와 마지막 장소를 고정하고 나머지를 이동 거리 위주로 정렬해요.</p>
          {places.some(p => p.isFixed) ? <p className="v165-quick-alert" role="alert">
            <span className="v165-alert-symbol" aria-hidden="true">!</span>
            <span><strong>예약 시간이 있는 장소가 있어요.</strong>
              빠르게 정렬은 고정 예약 시각을 고려하지 않아요. 예약이 있다면 꼼꼼한 최적화를 선택해 주세요.</span>
          </p> : <div className="v165-quick-stay-note" role="group" aria-label="빠른 정렬 방문 정보">
            <div className="v165-quick-stay-copy">
              <strong>{(places.find(place => place.isStartPoint) || places[0])?.placeName}
                {" → "}{places[places.length - 1]?.placeName}</strong>
              <span>중간 방문지 {Math.max(0, places.length - 2)}곳</span>
              <p>중간 방문지마다 머무르는 시간을 설정하면 예상 시간표를 더 정확하게 만들 수 있어요.</p>
            </div>
            <button type="button" className="v165-quick-stay-link"
              onClick={() => navigate(detailHref + "&edit=1&day=" + encodeURIComponent(day))}>
              수정하러 가기
            </button>
          </div>}
        </div>}
      {canPlan && beforeMetrics && afterMetrics && <div className="v165-route-compare" role="group" aria-label="동선 거리 비교">
        <div><span>원본 동선 예상 거리</span><strong>{beforeMetrics.distanceKm.toFixed(1)} km</strong></div>
        <span aria-hidden="true">→</span>
        <div><span>최적화안 예상 거리</span><strong>{afterMetrics.distanceKm.toFixed(1)} km</strong></div>
        <small>{distanceDifference > 0 ? `예상 거리 ${distanceDifference.toFixed(1)} km 감소` :
          distanceDifference < 0 ? `예약과 시간 조건으로 예상 거리 ${Math.abs(distanceDifference).toFixed(1)} km 증가` :
          "예상 거리가 같아요."} · 직선거리 기반 자체 추정값</small>
      </div>}
      <button className="v165-primary" type="button" disabled={!canPlan || !plan || !plan.rows.length}
        onClick={() => { setStage("preview"); setPreviewMode("after"); setNotice(""); }}>상세 일정 미리보기 →</button>
    </> : <>
      <div className="v165-switch" role="group" aria-label="일정 버전 미리보기">
        <button type="button" aria-pressed={previewMode === "before"} onClick={() => setPreviewMode("before")}>Before · 직접 만든 일정</button>
        <button type="button" aria-pressed={previewMode === "after"} onClick={() => setPreviewMode("after")}>After · 최적화한 일정</button>
      </div>
      {previewMode === "before" ? <div className="v165-card">
        <h2>직접 만든 일정</h2>
        <p>사용자가 저장한 장소 순서와 방문 시각만 표시해요.</p>
        {before.map((place, i) => <div className="v165-before-row" key={placeKey(place)}>
          <span>{i + 1}</span><strong>{place.placeName}</strong>
          <time>{place.arrivalTime ? String(place.arrivalTime).slice(0, 5) : "—"}</time>
        </div>)}
      </div> : <div className="v165-card">
        <h2>최적화한 상세 시간표</h2>
        <p>좌표 기반 이동시간 추정과 설정한 머무르는 시간을 사용해요. 실제 교통 상황과 다를 수 있어요.</p>
        {beforeMetrics && afterMetrics && <div className="v165-preview-stats" role="group" aria-label="최적화 효과 요약">
          <div><span>예상 이동 거리</span><strong>{afterMetrics.distanceKm.toFixed(1)} km</strong></div>
          <div><span>예상 이동 시간</span><strong>{afterMetrics.travelMinutes}분</strong></div>
          <div><span>예상 마지막 도착</span><strong>{clockLabelWithDay(plan?.arrival)}</strong></div>
        </div>}
        {mode === "quick" && places.some(p => p.isFixed) &&
          <p className="v165-quick-alert"><span className="v165-alert-symbol" aria-hidden="true">!</span>
            <span>빠르게 정렬은 예약 시각을 반영하지 않아요. 예약이 있다면 꼼꼼한 최적화를 선택해 주세요.</span>
          </p>}
        {warnings.map((item, i) => <p key={i} className="v165-warning">⚠ {item}</p>)}
        {plan?.rows.map((row, i) => <PreviewRow key={i} row={row}/>)}
        <p className="v165-note">시간을 바꾸려면 이전 화면의 장소 수정 또는 이동 시간 수정에서 입력해 주세요.</p>
      </div>}
      {notice && <p className="v165-error" role="alert">{notice}</p>}
      <p className="v165-note">원본은 유지되고 최적화안은 현재 브라우저에 별도로 보관돼요. 다른 기기와 동기화되지는 않아요.</p>
      <button className="v165-primary" type="button"
        onClick={() => requiresConfirmation ? setConfirmApply(true) : save()}
        disabled={!canPlan || !plan || previewMode !== "after"}>최적화안 적용</button>
      {previewMode === "before" && <p className="v165-note">최적화한 일정(After)을 선택하면 적용할 수 있어요.</p>}
      {confirmApply && <div className="v165-confirm-overlay">
        <div role="alertdialog" aria-modal="true" aria-label="최적화 경고 확인"
          aria-describedby="v165-confirm-desc" className="v165-confirm-dialog"
          onKeyDown={event => { if (event.key === "Escape") setConfirmApply(false); }}>
          <strong>최적화 주의사항을 확인해 주세요.</strong>
          <p id="v165-confirm-desc">예약 시간 미반영, 예상 지연 또는 일정 초과 가능성이 있어요. 원본 일정은 유지되지만 이 최적화안을 별도로 적용할까요?</p>
          <ul>
            {skippedReservations && <li>빠르게 정렬은 고정 방문·예약 시간을 고려하지 않아요.</li>}
            {warnings.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
          <div>
            <button type="button" autoFocus onClick={() => setConfirmApply(false)}>취소</button>
            <button type="button" onClick={save}>경고 확인 후 적용</button>
          </div>
        </div>
      </div>}
      <button className="v165-secondary" type="button" onClick={() => setStage("setup")}>조건 다시 수정</button>
    </>}
  </main>;
}
