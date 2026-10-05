import { useRef, useState } from "react";

// Memory only: never copies authentication or account data into a shared draft.
export default function useGenerationTask() {
  const lock = useRef(false);
  const [state, setState] = useState({ status: "idle", stage: "", tripId: null, completed: [] });
  const run = async (work) => {
    if (lock.current) return null;
    lock.current = true;
    let progress = { status: "running", stage: "여행 생성", tripId: null, completed: [] };
    setState(progress);
    const update = (changes) => {
      progress = { ...progress, ...changes };
      setState(progress);
    };
    try {
      const result = await work(update);
      update({ status: "success", stage: "저장 완료" });
      // Keep locked until an explicit new operation; a double click cannot create again.
      return result;
    } catch (error) {
      update({ status: "failed" });
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
