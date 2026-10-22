// Pure read-only reconciliation. Never guess when more than one new matching trip exists.
const idOf = trip => Number(trip?.id ?? trip?.tripId ?? trip?.routeId);
export function findConfirmedCreatedTrip(before, after, requested) {
  if (!Array.isArray(before) || !Array.isArray(after)) return null;
  if (before.some(row => !Number.isSafeInteger(idOf(row)) || idOf(row) <= 0) ||
      after.some(row => !Number.isSafeInteger(idOf(row)) || idOf(row) <= 0)) return null;
  const seen = new Set(before.map(idOf));
  const matching = after.filter(row =>
    !seen.has(idOf(row)) &&
    row.title === requested.title &&
    row.destination === requested.destination &&
    row.startDate === requested.startDate &&
    row.endDate === requested.endDate
  );
  return matching.length === 1 ? matching[0] : null;
}
