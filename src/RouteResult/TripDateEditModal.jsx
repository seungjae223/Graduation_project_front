import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./TripDateEditModal.css";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const formatKey = (year, month, date) =>
  [year, String(month + 1).padStart(2, "0"), String(date).padStart(2, "0")].join("-");
const dayCount = (start, end) => start && end && end >= start
  ? Math.round((Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) / 86400000) + 1 : 0;

export default function TripDateEditModal({ startDate, endDate, onClose, onSave, busy, error }) {
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const [month, setMonth] = useState(() => new Date(Number(startDate.slice(0,4)), Number(startDate.slice(5,7)) - 1, 1));
  const [closing, setClosing] = useState(false);
  const [picker, setPicker] = useState("days");
  const [yearStart, setYearStart] = useState(() => Math.floor(Number(startDate.slice(0,4)) / 12) * 12);
  const span = dayCount(start, end);
  const changed = Boolean(span && (start !== startDate || end !== endDate));
  const cells = useMemo(() => {
    const year = month.getFullYear(), m = month.getMonth(), length = new Date(year, m + 1, 0).getDate();
    return [...Array(new Date(year,m,1).getDay()).fill(null),
      ...Array.from({length}, (_,i) => formatKey(year,m,i+1))];
  }, [month]);

  const dismiss = () => { if (!busy) setClosing(true); };
  useEffect(() => {
    if (!closing) return undefined;
    const timeout = window.setTimeout(onClose, 210);
    return () => window.clearTimeout(timeout);
  }, [closing, onClose]);
  useEffect(() => {
    const esc = event => { if (event.key === "Escape") dismiss(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
    // The modal is closed only through explicit interaction.
  });
  const choose = key => {
    if (busy) return;
    if (!start || end || key < start) { setStart(key);setEnd(""); }
    else setEnd(key);
  };
  const shift = delta => {
    if (picker === "years") setYearStart(v=>v+12*delta);
    else setMonth(v=>new Date(month.getFullYear()+(picker==="months"?delta:0),month.getMonth()+(picker==="days"?delta:0),1));
  };
  return createPortal(<>
    <div className={"v167-date-overlay" + (closing ? " is-closing" : "")}
      onPointerDown={event => { if (event.target === event.currentTarget) dismiss(); }}>
      <section className="v167-date-dialog" role="dialog" aria-modal="true"
        aria-label="여행 날짜 수정">
        <div className="v167-date-title"><button type="button" aria-label="달력 닫기"
          onClick={dismiss} disabled={busy}>×</button><strong>여행 날짜 수정</strong></div>
        <div className="v167-date-nav">
          <button type="button" onClick={()=>shift(-1)} disabled={busy} aria-label="이전 기간">‹</button>
          <button type="button" onClick={()=>setPicker(picker==="days"?"months":picker==="months"?"years":"days")}
            disabled={busy}>{picker==="years"?yearStart+"–"+(yearStart+11)+"년"
              :picker==="months"?month.getFullYear()+"년":month.getFullYear()+"년 "+(month.getMonth()+1)+"월"} ⌄</button>
          <button type="button" onClick={()=>shift(1)} disabled={busy} aria-label="다음 기간">›</button>
        </div>
        {picker==="days"?<div className="v167-date-grid">
          {weekdays.map(day=><small key={day}>{day}</small>)}
          {cells.map((day,i)=>day?<button type="button" key={day} aria-label={day}
            aria-pressed={day===start||day===end} disabled={busy}
            className={[(day===start||day===end)&&"is-end",start&&end&&day>start&&day<end&&"is-between"].filter(Boolean).join(" ")}
            onClick={()=>choose(day)}>{Number(day.slice(-2))}</button>:<span key={"blank-"+i}/>)}
        </div>:<div className="v167-date-choices">
          {(picker==="months"?Array.from({length:12},(_,i)=>i+1)
            :Array.from({length:12},(_,i)=>yearStart+i)).map(n=><button key={n} disabled={busy}
              onClick={() => {if(picker==="months"){setMonth(new Date(month.getFullYear(),n-1,1));setPicker("days");}
              else {setMonth(new Date(n,month.getMonth(),1));setPicker("months");}}}>{n}{picker==="months"?"월":"년"}</button>)}
        </div>}
        <div className="v167-date-summary">
          <span>출발 <strong>{start || "—"}</strong></span>
          <span>도착 <strong>{end || "—"}</strong></span>
          {span>0 && <small>{span-1}박 {span}일</small>}
        </div>
        <p className="v167-date-help">출발일과 도착일을 차례대로 선택해 주세요.</p>
        {error && <p role="alert" className="v167-date-error">{error}</p>}
      </section>
    </div>
    {changed && <div className={"v167-date-dock" + (closing ? " is-closing" : "")}>
      <button type="button" onClick={()=>onSave(start,end)} disabled={busy}>
        {busy ? "날짜 확인 중..." : "날짜 수정"}
      </button>
    </div>}
  </>,document.body);
}
