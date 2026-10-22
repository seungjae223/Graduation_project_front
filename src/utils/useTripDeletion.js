import { useEffect, useRef, useState } from "react";
import { deleteTripApi } from "../api/tripApi";
import { getAuthSnapshot } from "./authState";
import { uncertainMutation } from "./useMutationTask";

// Sequential batch deletion: one confirmation, no automatic retry of an uncertain DELETE.
export default function useTripDeletion(account, onDeleted) {
  const lock = useRef(false);
  const mounted = useRef(true);
  const latest = useRef({ account, onDeleted });
  latest.current = { account, onDeleted };
  const [pendingId, setPendingId] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    mounted.current = true;
    setNotice("");
    return () => { mounted.current = false; };
  }, [account]);

  const deleteTrips = async trips => {
    if (lock.current || !Array.isArray(trips) || trips.length === 0) return { complete: false };
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

    lock.current = true;
    setNotice("");
    const owner = account;
    let completed = 0;
    let errorMessage = "";
    try {
      for (const trip of selected) {
        if (!mounted.current || latest.current.account !== owner ||
            getAuthSnapshot().accountKey !== owner) break;
        setPendingId(String(trip.id));
        try {
          await deleteTripApi(trip.id);
        } catch (error) {
          errorMessage = uncertainMutation(error)
            ? "삭제 결과가 불확실해요. 목록을 다시 조회해 주세요. 자동으로 다시 삭제하지 않습니다."
            : "여행 일정을 삭제하지 못했어요. 다시 확인해 주세요.";
          break;
        }
        completed += 1;
        if (mounted.current && latest.current.account === owner &&
            getAuthSnapshot().accountKey === owner) latest.current.onDeleted(String(trip.id));
      }
      if (mounted.current && latest.current.account === owner) {
        if (errorMessage) {
          setNotice((completed ? completed + "개 삭제 완료. " : "") + errorMessage);
        }
      }
    } finally {
      lock.current = false;
      if (mounted.current && latest.current.account === owner) setPendingId(null);
    }
    return { complete: completed === selected.length, deleted: completed };
  };

  return { deleteTrips, pendingId, busy: pendingId !== null, notice };
}
