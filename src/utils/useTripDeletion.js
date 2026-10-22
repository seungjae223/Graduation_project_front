import { useEffect, useRef, useState } from "react";
import { deleteTripApi, getTripsApi } from "../api/tripApi";
import { getAuthSnapshot } from "./authState";
import { uncertainMutation } from "./useMutationTask";

// Sequential batch deletion: one confirmation, no automatic retry of an uncertain DELETE.
export default function useTripDeletion(account, onDeleted) {
  const lock = useRef(null);
  const generation = useRef(0);
  const unresolved = useRef(null);
  const mounted = useRef(true);
  const latest = useRef({ account, onDeleted });
  latest.current = { account, onDeleted };
  const [pendingId, setPendingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    mounted.current = true;
    generation.current += 1;
    lock.current = null;
    unresolved.current = null;
    setPendingId(null);
    setNotice("");
    setNeedsVerification(false);
    return () => { mounted.current = false; generation.current += 1; };
  }, [account]);

  const isCurrent = task => mounted.current && generation.current === task.generation &&
    latest.current.account === task.owner && getAuthSnapshot().accountKey === task.owner;

  // A failed response can arrive after the server committed the deletion. Only a
  // fresh, validated server list may remove the ticket; never resend DELETE here.
  const verifyRemoval = async task => {
    try {
      const trips = await getTripsApi();
      if (!isCurrent(task)) return "stale";
      if (!Array.isArray(trips)) throw new Error("Invalid trip list");
      unresolved.current = null;
      setNeedsVerification(false);
      if (!trips.some(trip => String(trip.id) === String(task.id))) {
        latest.current.onDeleted(String(task.id));
        return "deleted";
      }
      return "retained";
    } catch {
      if (!isCurrent(task)) return "stale";
      unresolved.current = task;
      setNeedsVerification(true);
      return "unknown";
    }
  };

  const verificationMessage = result => result === "unknown"
    ? "삭제 결과를 확인하지 못했어요. 아래 버튼으로 결과를 다시 확인해 주세요. 삭제 요청은 다시 보내지 않습니다."
    : "목록을 다시 확인했으며 일정이 아직 남아 있어요. 잠시 후 다시 삭제해 주세요.";

  const retryVerification = async () => {
    const task = unresolved.current;
    if (lock.current || !task || !isCurrent(task)) return;
    lock.current = task;
    setPendingId(String(task.id));
    try {
      const result = await verifyRemoval(task);
      if (!isCurrent(task)) return;
      setNotice(result === "deleted" ? "일정 삭제를 확인했어요." : verificationMessage(result));
    } finally {
      if (lock.current === task) lock.current = null;
      if (isCurrent(task)) setPendingId(null);
    }
  };

  const deleteTrips = async trips => {
    if (lock.current || unresolved.current || !Array.isArray(trips) || trips.length === 0) return { complete: false };
    const selected = trips.map(trip => ({ id: Number(trip.routeId || trip.id), title: trip.title || "여행 일정" }));
    if (selected.some(trip => !Number.isSafeInteger(trip.id) || trip.id <= 0) ||
        new Set(selected.map(trip => trip.id)).size !== selected.length) {
      setNotice("삭제할 여행 일정을 확인하지 못했어요.");
      return { complete: false };
    }
    const question = selected.length === 1
      ? "'" + selected[0].title + "' 일정을 영구 삭제할까요?"
      : "선택한 여행 일정 " + selected.length + "개를 영구 삭제할까요?";
    if (!window.confirm(question +
      "\n일정과 일정에 속한 장소 기록이 함께 삭제될 수 있으며, 삭제 후 복구할 수 없습니다.")) {
      return { complete: false, canceled: true };
    }

    const task = { owner: account, generation: generation.current };
    if (!isCurrent(task)) return { complete: false };
    lock.current = task;
    setNotice("");
    let completed = 0;
    let errorMessage = "";
    try {
      for (const trip of selected) {
        if (!isCurrent(task)) break;
        setPendingId(String(trip.id));
        try {
          await deleteTripApi(trip.id);
        } catch (error) {
          if (!isCurrent(task)) break;
          if (uncertainMutation(error) || error?.response?.status === 404) {
            const result = await verifyRemoval({ ...task, id: trip.id });
            if (result === "stale") break;
            if (result === "deleted") { completed += 1; continue; }
            errorMessage = verificationMessage(result);
          } else {
            errorMessage = "여행 일정을 삭제하지 못했어요. 다시 확인해 주세요.";
          }
          break;
        }
        if (!isCurrent(task)) break;
        completed += 1;
        latest.current.onDeleted(String(trip.id));
      }
      if (isCurrent(task)) {
        if (errorMessage) {
          setNotice((completed ? completed + "개 삭제 완료. " : "") + errorMessage);
        }
      }
    } finally {
      if (lock.current === task) lock.current = null;
      if (isCurrent(task)) setPendingId(null);
    }
    return { complete: completed === selected.length, deleted: completed };
  };

  return { deleteTrips, pendingId, busy: pendingId !== null, notice, needsVerification, retryVerification };
}
