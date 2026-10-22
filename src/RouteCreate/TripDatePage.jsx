import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import useSessionKey from "../utils/useSessionKey";
import { clearDateDraft, dateKey, inclusiveDays, saveDateDraft } from "./tripCreationDraft";
import "./TripDatePage.css";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const yearBlock = year => Math.floor(year / 12) * 12;

export function makeMonthCells(year, month) {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  return [...Array(first.getDay()).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => dateKey(new Date(year, month, i + 1)))];
}

export default function TripDatePage() {
  const navigate = useNavigate();
  const account = useSessionKey();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  // A fresh visit is a new creation, not a resume of an abandoned draft.
  useEffect(() => {
    clearDateDraft(account);
    setStartDate("");
    setEndDate("");
  }, [account]);
  const [picker, setPicker] = useState("days");
  const [firstYear, setFirstYear] = useState(() => yearBlock(new Date().getFullYear()));
  const [error, setError] = useState("");
  const cells = useMemo(() => makeMonthCells(month.getFullYear(), month.getMonth()), [month]);
  const days = inclusiveDays(startDate, endDate);

  const choose = key => {
    setError("");
    if (!startDate || endDate || key < startDate) {
      setStartDate(key);
      setEndDate("");
    } else {
      setEndDate(key);
    }
  };
  const changePeriod = offset => {
    if (picker === "years") setFirstYear(previous => previous + offset * 12);
    else if (picker === "months") setMonth(previous => new Date(previous.getFullYear() + offset, previous.getMonth(), 1));
    else setMonth(previous => new Date(previous.getFullYear(), previous.getMonth() + offset, 1));
  };
  const next = () => {
    if (!days) return;
    if (!saveDateDraft(account, { startDate, endDate })) {
      setError("날짜를 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
      return;
    }
    navigate("/route-create/region");
  };

  return <>
    <main className="v16-create-page">
      <header className="v16-create-heading">
        <p>NEW TRIP</p>
        <h1>언제 떠날까요?</h1>
      </header>
      <section className="v16-date-calendar" aria-label="여행 날짜 선택">
        <div className="v16-date-month">
          <button type="button" onClick={() => changePeriod(-1)}
            aria-label={picker === "years" ? "이전 연도 목록" : picker === "months" ? "이전 연도" : "이전 달"}>‹</button>
          {picker === "days" ? <button type="button" className="v16-date-period-switch"
            aria-label="월 선택" onClick={() => setPicker("months")}>
            {month.getFullYear()}년 {month.getMonth() + 1}월 <span aria-hidden="true">⌄</span>
          </button> : picker === "months" ? <button type="button" className="v16-date-period-switch"
            aria-label="연도 선택" onClick={() => {
              setFirstYear(yearBlock(month.getFullYear()));
              setPicker("years");
            }}>
            {month.getFullYear()}년 <span aria-hidden="true">⌄</span>
          </button> : <span className="v16-date-period-title">{firstYear} — {firstYear + 11}년</span>}
          <button type="button" onClick={() => changePeriod(1)}
            aria-label={picker === "years" ? "다음 연도 목록" : picker === "months" ? "다음 연도" : "다음 달"}>›</button>
        </div>
        {picker === "days" ? <div className="v16-date-grid">
          {WEEKDAYS.map(day => <span key={day} className="v16-date-weekday">{day}</span>)}
          {cells.map((key, i) => key ? <button type="button" key={key}
            aria-label={key} aria-pressed={key === startDate || key === endDate}
            className={["v16-date-day", key >= startDate && endDate && key <= endDate && "is-range",
              key === startDate && "is-start", key === endDate && "is-end"].filter(Boolean).join(" ")}
            onClick={() => choose(key)}>{Number(key.slice(-2))}</button>
            : <span key={"blank-" + i} />)}
        </div> : <div className="v16-date-picker-grid" role="group" aria-label={picker === "years" ? "연도 목록" : "월 목록"}>
          {picker === "months" ? MONTHS.map(value => <button type="button" key={value}
            className={month.getMonth() + 1 === value ? "is-active" : ""}
            onClick={() => {
              setMonth(new Date(month.getFullYear(), value - 1, 1));
              setPicker("days");
            }}>{value}월</button>)
            : Array.from({ length: 12 }, (_, i) => firstYear + i).map(year =>
              <button type="button" key={year}
                className={month.getFullYear() === year ? "is-active" : ""}
                onClick={() => {
                  setMonth(new Date(year, month.getMonth(), 1));
                  setPicker("months");
                }}>{year}년</button>)}
        </div>}
      </section>
      <div className="v16-date-period" role="status">
        <div className="v16-date-period-pair">
          <div><small>출발</small><strong>{startDate ? startDate.replace(/-/g, ".") : "—"}</strong></div>
          <span className="v16-date-period-arrow" aria-hidden="true">→</span>
          <div><small>도착</small><strong>{endDate ? endDate.replace(/-/g, ".") : "—"}</strong></div>
        </div>
        {days > 0 && <strong className="v16-date-stay">{days - 1}박 {days}일</strong>}
      </div>
      {error && <p className="v16-date-error" role="alert">{error}</p>}
    </main>
    {createPortal(<div className="v16-date-actions">
      <button type="button" disabled={!days} onClick={next}>다음</button>
    </div>, document.body)}
  </>;
}
