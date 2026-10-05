import { useEffect, useRef, useState } from "react";

export const uncertainMutation = error => !error?.response || Number(error.response.status) >= 500;
// Never resend a confirmed or uncertain mutation while refreshing its read model.
export default function useMutationTask(key) {
  const current = useRef(key); current.current = key;
  const locks = useRef(new Map());
  const mounted = useRef(true);
  const [states, setStates] = useState({});
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const publish = (target, update) => { if (mounted.current) setStates(previous => ({ ...previous, [target]: update })); };
  const run = async (write, refresh, labels) => {
    const target = key;
    if (locks.current.has(target)) return;
    const task = { key: target, refresh, labels }; locks.current.set(target, task);
    publish(target, { status: "running", message: "처리 중..." });
    try { await write(); }
    catch (error) {
      const unknown = uncertainMutation(error);
      publish(target, { status: unknown ? "unknown" : "error", message: unknown ? "변경 여부를 확인하지 못했어요. 자동으로 다시 보내지 않습니다. 최신 상태를 확인해 주세요." : labels.failure });
      if (!unknown && locks.current.get(target) === task) locks.current.delete(target);
      return;
    }
    try { if (current.current !== target || !mounted.current) throw new Error("화면 변경"); await refresh(); publish(target, { status: "success", message: labels.success }); if (locks.current.get(target) === task) locks.current.delete(target); }
    catch { publish(target, { status: "refreshError", message: labels.refreshFailure }); }
  };
  const retryRead = async () => {
    const target = key;
    const task = locks.current.get(target);
    if (!task || task.key !== key || task.reading) return;
    task.reading = true;
    const unknown = states[key]?.status === "unknown";
    try {
      await task.refresh();
      publish(key, { status: unknown ? "unknown" : "success", message: unknown ? "최신 목록을 확인했습니다. 이번 변경의 반영 여부는 확정할 수 없습니다. 화면을 확인해 주세요." : task.labels.success });
      if (!unknown && locks.current.get(target) === task) locks.current.delete(target);
    } catch { publish(key, { status: unknown ? "unknown" : "refreshError", message: unknown ? "변경 여부와 최신 목록을 확인하지 못했어요." : task.labels.refreshFailure }); }
    finally { task.reading = false; }
  };
  const shown = states[key] || { status: "idle", message: "" };
  const reset = () => { if (!locks.current.has(key)) publish(key, { status: "idle", message: "" }); };
  return { ...shown, blocked: ["running", "refreshError", "unknown"].includes(shown.status), run, retryRead, reset };
}
