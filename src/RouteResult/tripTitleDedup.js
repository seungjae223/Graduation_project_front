// Title collisions are scoped to the authenticated user's own trip list.
export function uniqueTripTitle(raw, trips, currentTripId) {
  const requested = String(raw || "").trim().normalize("NFC");
  if (!requested || requested.length > 100) throw new Error("일정명은 1~100자로 입력해 주세요.");
  const taken = new Set((trips || []).filter(trip=>String(trip.id)!==String(currentTripId))
    .map(trip=>String(trip.title||"").trim().normalize("NFC")));
  if (!taken.has(requested)) return requested;
  for (let n=1;n<10000;n++){
    const suffix = ` (${n})`;
    const candidate = requested.slice(0,100-suffix.length).trimEnd() + suffix;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error("사용할 수 있는 여행 이름을 찾지 못했어요.");
}
