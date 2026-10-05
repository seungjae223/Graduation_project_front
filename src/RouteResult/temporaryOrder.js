export const visitKey = item => String(item.tripPlaceId ?? item.id);
export const sameOrder = (a, b) => a.length === b.length && a.every((item, index) => visitKey(item) === visitKey(b[index]));
export function editDayOrder(day, nextItems) {
  const originals = new Map(day.items.map(item => [visitKey(item), item]));
  if (sameOrder(day.items, nextItems)) return day;
  return { ...day, isCustomOrder: true, items: nextItems.map(item => {
    const original = originals.get(visitKey(item));
    return { ...original, time: original.fixedTime || "재계산 필요", previousEstimatedTime: original.time, previousEstimatedDeparture: original.departureTime, departureTime: "", needsRecalculation: true };
  }) };
}
