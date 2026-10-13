import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const mapVisitKey = (item, index) => String(item.tripPlaceId ?? item.id ?? item.sourceId ?? `${item.title}:${index}`);
export const coordinateDayKey = (day, index) => JSON.stringify([index, day?.label, (day?.items || []).map((item, position) => [
  mapVisitKey(item, position), item.title, item.address || item.desc || "", item.lat ?? item.latitude, item.lng ?? item.longitude,
]).sort((a, b) => a[0].localeCompare(b[0]))]);

export default function useResolvedMapCoordinates(owner, days, transformDay) {
  const latest = useRef({ owner, days }); latest.current = { owner, days };
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [record, setRecord] = useState({ owner, days: {} });
  const publish = useCallback(result => {
    const current = latest.current;
    if (!mounted.current || result.owner !== current.owner || result.key !== coordinateDayKey(current.days[result.dayIndex], result.dayIndex)) return;
    const visits = new Set((current.days[result.dayIndex]?.items || []).map(mapVisitKey));
    const points = Object.fromEntries(result.points.filter(point => visits.has(point.visitKey) && Number.isFinite(point.lat) && Number.isFinite(point.lng)).map(point => [point.visitKey, { lat: point.lat, lng: point.lng }]));
    setRecord(previous => {
      const saved = previous.owner === result.owner ? previous.days : {};
      if (saved[result.dayIndex]?.key === result.key && JSON.stringify(saved[result.dayIndex].points) === JSON.stringify(points)) return previous;
      return { owner: result.owner, days: { ...saved, [result.dayIndex]: { key: result.key, points } } };
    });
  }, []);
  const resolvedDays = useMemo(() => days.map((day, index) => {
    const entry = record.owner === owner ? record.days[index] : null;
    if (!entry || entry.key !== coordinateDayKey(day, index)) return day;
    const resolvedDay = { ...day, items: day.items.map((item, position) => {
      const point = entry.points[mapVisitKey(item, position)];
      return point ? { ...item, lat: point.lat, lng: point.lng, latitude: point.lat, longitude: point.lng } : item;
    }) };
    return transformDay ? transformDay(resolvedDay) : resolvedDay;
  }), [days, owner, record, transformDay]);
  return { days: resolvedDays, publish };
}
