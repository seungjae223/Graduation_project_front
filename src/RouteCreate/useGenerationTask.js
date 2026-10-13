import { useEffect, useRef, useState } from "react";
import useSessionKey from "../utils/useSessionKey";

// Memory only: never copies authentication or account data into a shared draft.
export default function useGenerationTask() {
  const lock = useRef(false);
  const owner = useSessionKey();
  const currentOwner = useRef(owner); currentOwner.current = owner;
  const active = useRef(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; active.current?.controller.abort(); }; }, []);
  useEffect(() => {
    active.current?.controller.abort(); active.current = null;
    lock.current = false;
    setState({ status: "idle", stage: "", tripId: null, completed: [] });
  }, [owner]);
  const [state, setState] = useState({ status: "idle", stage: "", tripId: null, completed: [] });
  const run = async (work) => {
    if (lock.current) return null;
    lock.current = true;
    const operation = { owner, controller: new AbortController() };
    active.current = operation;
    const isCurrent = () => mounted.current && active.current === operation && currentOwner.current === owner && !operation.controller.signal.aborted;
    let progress = { status: "running", stage: "여행 생성", tripId: null, completed: [] };
    setState(progress);
    const update = (changes) => {
      progress = { ...progress, ...changes };
      if (isCurrent()) setState(progress);
    };
    try {
      const result = await work(update, { isCurrent, signal: operation.controller.signal });
      if (!isCurrent()) return null;
      update({ status: "success", stage: "저장 완료" });
      // Keep locked until an explicit new operation; a double click cannot create again.
      return result;
    } catch (error) {
      if (!isCurrent()) return null;
      update({ status: "failed", beforeWrite: Boolean(error.beforeWrite), error: error.beforeWrite ? error.message : "" });
      // A failed/unknown mutation must never be automatically resent.
      throw error;
    }
  };
  const reset = () => {
    if (state.status === "running") return;
    lock.current = false;
    setState({ status: "idle", stage: "", tripId: null, completed: [] });
  };
  return { ...state, run, reset };
}
