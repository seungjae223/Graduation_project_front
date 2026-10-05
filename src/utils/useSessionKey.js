import { useSyncExternalStore } from "react";
import { getAuthSnapshot, subscribeAuth } from "./authState";
export default function useSessionKey() {
  return useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthSnapshot).accountKey;
}