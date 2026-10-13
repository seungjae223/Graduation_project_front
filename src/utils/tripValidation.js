const validDate = value => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export function validateTripRequest(request) {
  if (!validDate(request.startDate) || !validDate(request.endDate) || request.endDate < request.startDate) {
    throw new Error("여행 시작일과 종료일을 확인해주세요.");
  }
  if (!Number.isFinite(request.latitude) || Math.abs(request.latitude) > 90 ||
      !Number.isFinite(request.longitude) || Math.abs(request.longitude) > 180) {
    throw new Error("여행 좌표를 확인해주세요.");
  }
  return request;
}
