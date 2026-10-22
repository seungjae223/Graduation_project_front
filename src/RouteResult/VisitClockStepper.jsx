import React, { useEffect, useRef } from "react";
import "./VisitClockStepper.css";

const addMinutes = (value, amount) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value || "");
  if (!match) return addMinutes("00:00", amount);
  const total = (Number(match[1]) * 60 + Number(match[2]) + amount + 1440) % 1440;
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" +
    String(total % 60).padStart(2, "0");
};
/* Custom three-segment clock with hold-to-repeat and keyboard arrow input. */
export const stepClock = (value, part, direction) => {
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value || "")) {
    // First period/hour press: 12 AM; first minute-down: 12:01 AM.
    return part === "minute" ? "00:01" : "00:00";
  }
  if (part === "period") return addMinutes(value, 720);
  // Up moves to the preceding hour: 12 AM -> 11 PM on the next press.
  if (part === "hour") return addMinutes(value, direction === "up" ? -60 : 60);
  return addMinutes(value, direction === "up" ? -1 : 1);
};
function ClockSegment({ part, label, display, valueNow, max, disabled, onStep }) {
  const holdTimeout = useRef(null);
  const holdInterval = useRef(null);
  const longHeld = useRef(false);
  const latestStep = useRef(onStep);
  latestStep.current = onStep;
  const stop = () => {
    clearTimeout(holdTimeout.current);
    clearInterval(holdInterval.current);
    holdTimeout.current = null;
    holdInterval.current = null;
  };
  useEffect(() => () => {
    clearTimeout(holdTimeout.current);
    clearInterval(holdInterval.current);
  }, []);
  const start = direction => {
    if (holdTimeout.current || holdInterval.current) return;
    stop();
    longHeld.current = false;
    holdTimeout.current = setTimeout(() => {
      longHeld.current = true;
      latestStep.current(part, direction);
      holdInterval.current = setInterval(() => latestStep.current(part, direction), 105);
    }, 480);
  };
  const arrow = direction => <button type="button" className={"v16-inline-clock-arrow is-" + direction}
    disabled={disabled} aria-label={label + (direction === "up" ? " 위 화살표" : " 아래 화살표")}
    onPointerDown={event => {
      if (event.pointerType === "mouse" && event.button != null && event.button !== 0) return;
      start(direction);
    }}
    onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop}
    onMouseDown={event => { if (event.button === 0) { event.preventDefault(); start(direction); } }}
    onMouseUp={stop} onMouseLeave={stop}
    onTouchStart={() => start(direction)} onTouchEnd={stop} onTouchCancel={stop}
    onClick={() => {
      if (longHeld.current) { longHeld.current = false; return; }
      latestStep.current(part, direction);
    }}>
    {direction === "up" ? "▴" : "▾"}
  </button>;
  return <span className={"v16-inline-clock-segment is-" + part}>
    {arrow("up")}
    <span className="v16-inline-clock-value" role="spinbutton" tabIndex={disabled ? -1 : 0}
      aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={valueNow}
      aria-valuetext={display === "--" ? "미정" : display} aria-disabled={disabled}
      onKeyDown={event => {
        if (disabled) return;
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          onStep(part, event.key === "ArrowUp" ? "up" : "down");
        }
      }}>{display}</span>
    {arrow("down")}
  </span>;
}
export default function VisitClockStepper({ value, disabled, onStep, label = "방문 시각" }) {
  const valid = /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value || "");
  const hour = valid ? Number(value.slice(0, 2)) : 0;
  const minute = valid ? Number(value.slice(3)) : 0;
  const step = (part, direction) => onStep(part, direction);
  return <div className="v16-inline-clock-control"><div className="v16-inline-clock-stepper" role="group" aria-label={label}>
    <ClockSegment part="period" label="오전 오후" display={valid ? (hour < 12 ? "오전" : "오후") : "--"}
      valueNow={valid ? (hour < 12 ? 0 : 1) : undefined} max={1} disabled={disabled} onStep={step}/>
    <ClockSegment part="hour" label="시" display={valid ? String(hour % 12 || 12).padStart(2,"0") : "--"}
      valueNow={valid ? (hour % 12 || 12) : undefined} max={12} disabled={disabled} onStep={step}/>
    <span className="v16-inline-clock-colon" aria-hidden="true">:</span>
    <ClockSegment part="minute" label="분" display={valid ? String(minute).padStart(2,"0") : "--"}
      valueNow={valid ? minute : undefined} max={59} disabled={disabled} onStep={step}/>
  </div><small className="v16-inline-clock-hold-hint">화살표를 꾹 누르면 시간이 빠르게 변경돼요.</small></div>;
}

