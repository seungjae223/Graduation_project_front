import { useCallback, useEffect, useRef, useState } from "react";
import { getTripByIdApi, getTripPlacesApi, getTripTimelineApi } from "../api/tripApi";
import { getApiErrorMessage } from "../api/api";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";

const validId = (id) => /^\d+$/.test(String(id || "")) && Number.isSafeInteger(Number(id)) && Number(id) > 0;
const cancelled = (error) => error?.code === "ERR_CANCELED" || error?.name === "AbortError";
const EMPTY = { status: "loading", trip: null, places: [], timelines: {}, error: "" };

export default function useTripResult(id, demo = false) {
  const account = useSessionKey();
  const [state, setState] = useState({ id: null, account, status: "loading", trip: null, places: [], timelines: {}, error: "" });
  const generation = useRef(0);
  const controller = useRef(null);
  const busy = useRef(new Set());
  const confirmedPlaces = useRef([]);
  const dayVersions = useRef({});
  const current = useRef({ id, demo, account });
  current.current = { id, demo, account };

  const loadTimeline = useCallback(async (tripId, day, version, signal) => {
    const dayVersion = dayVersions.current[day] || 0;
    const key = `${version}:${day}:${dayVersion}`;
    if (busy.current.has(key)) return;
    busy.current.add(key);
    const owner = current.current.account;
    const alive = () => generation.current === version && (dayVersions.current[day] || 0) === dayVersion && !signal.aborted && String(current.current.id) === String(tripId) && current.current.account === owner && getAuthSnapshot().accountKey === owner;
    if (alive()) setState(s => ({ ...s, timelines: { ...s.timelines, [day]: { status: "loading" } } }));
    try {
      const items = await getTripTimelineApi({ tripId, day, startTime: "10:00", signal });
      if (items.some(item => !Number.isInteger(Number(item.visitOrder)) || Number(item.visitOrder) < 1) ||
          new Set(items.map(item => String(item.visitOrder))).size !== items.length ||
          items.some(item => !confirmedPlaces.current.some(place => Number(place.day) === day && Number(place.visitOrder) === Number(item.visitOrder)))) {
        throw new Error("타임라인 방문 순서를 확인할 수 없습니다.");
      }
      if (alive()) setState(s => ({ ...s, timelines: { ...s.timelines, [day]: { status: "success", items } } }));
      return alive();
    } catch (error) {
      if (alive() && !cancelled(error)) setState(s => ({ ...s, timelines: { ...s.timelines, [day]: {
        status: "error", error: getApiErrorMessage(error, "타임라인을 불러오지 못했습니다.")
      } } }));
      return false;
    } finally { busy.current.delete(key); }
  }, []);

  const load = useCallback(async () => {
    if (busy.current.has("detail")) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const version = ++generation.current;
    dayVersions.current = {};
    if (demo) {
      setState({ id, account, status: "demo", trip: null, places: [], timelines: {}, error: "" });
      return;
    }
    if (!validId(id)) {
      setState({ id, account, status: "invalid", trip: null, places: [], timelines: {}, error: "유효한 일정 ID가 필요합니다. 일정 목록에서 선택해 주세요." });
      return;
    }
    busy.current.add("detail");
    const alive = () => generation.current === version && !request.signal.aborted && String(current.current.id) === String(id) && current.current.account === account && getAuthSnapshot().accountKey === account;
    setState({ id, account, status: "loading", trip: null, places: [], timelines: {}, error: "" });
    try {
      const [trip, places] = await Promise.all([
        getTripByIdApi(id, { signal: request.signal }),
        getTripPlacesApi(id, { signal: request.signal }),
      ]);
      if (!alive()) return;
      confirmedPlaces.current = places;
      const count = Math.floor((Date.parse(trip.endDate) - Date.parse(trip.startDate)) / 86400000) + 1;
      setState({ id, account, status: "success", trip, places, timelines: {}, error: "" });
      for (let day = 1; day <= count; day++) {
        if (places.some(place => Number(place.day) === day)) {
          void loadTimeline(id, day, version, request.signal);
        }
      }
    } catch (error) {
      if (alive() && !cancelled(error)) setState({ id, account, status: "error", trip: null, places: [], timelines: {},
        error: error.response?.status === 404 ? "일정을 찾을 수 없거나 접근할 수 없습니다." :
          getApiErrorMessage(error, "일정 정보를 불러오지 못했습니다.") });
    } finally { if (generation.current === version) busy.current.delete("detail"); }
  }, [id, demo, account, loadTimeline]);

  useEffect(() => {
    const pending = busy.current;
    pending.clear();
    void load();
    return () => { controller.current?.abort(); pending.clear(); };
  }, [load]);

  const retryTimeline = (day) => {
    if (state.status === "success" && controller.current && !controller.current.signal.aborted) {
      void loadTimeline(id, day, generation.current, controller.current.signal);
    }
  };
  const refreshDayOrder = async (day, expectedIds, { acceptDifferentOrder = false } = {}) => {
    const version = generation.current;
    const signal = controller.current?.signal;
    const owner = account;
    const alive = () => signal && !signal.aborted && generation.current === version &&
      String(current.current.id) === String(id) && current.current.account === owner && getAuthSnapshot().accountKey === owner;
    if (!alive()) throw new Error("일정 화면이 변경되었습니다.");
    // Ignore timelines calculated before this order change, even if abort is ignored.
    dayVersions.current[day] = (dayVersions.current[day] || 0) + 1;
    setState(s => ({ ...s, timelines: { ...s.timelines, [day]: { status: "loading" } } }));
    try {
      const places = await getTripPlacesApi(id, { signal });
      if (!alive()) throw new Error("일정 화면이 변경되었습니다.");
      const ordered = places.filter(place => Number(place.day) === day)
        .sort((a, b) => Number(a.visitOrder) - Number(b.visitOrder));
      const applied = ordered.length === expectedIds.length && ordered.every((place, index) =>
        String(place.tripPlaceId ?? place.id) === String(expectedIds[index]));
      if (!applied && !acceptDifferentOrder) {
        throw new Error("저장된 방문 순서를 확인하지 못했습니다.");
      }
      confirmedPlaces.current = places;
      setState(s => ({ ...s, places }));
      if (!await loadTimeline(id, day, version, signal)) {
        throw new Error("저장 후 타임라인을 확인하지 못했습니다.");
      }
      return { confirmed: true, applied };
    } catch (error) {
      if (alive()) setState(s => ({ ...s, timelines: { ...s.timelines, [day]: {
        status: "error", error: getApiErrorMessage(error, "저장된 순서와 타임라인을 다시 확인해주세요.")
      } } }));
      throw error;
    }
  };
  return { ...(String(state.id) === String(id) && state.account === account ? state : EMPTY), retry: load, retryTimeline, refreshDayOrder };
}
