// Keep at most five numbered controls, including first/last, for narrow screens.
export function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const start = Math.max(2, Math.min(currentPage - 1, totalPages - 3));
  const pages = [1, start, start + 1, start + 2, totalPages];
  const items = [];
  pages.forEach((page, index) => {
    if (index && page - pages[index - 1] > 1) items.push(`gap-${page}`);
    items.push(page);
  });
  return items;
}

// Search shows consecutive groups of five without skipping page numbers.
export function getPageNumberGroup(currentPage, totalPages) {
  const start = Math.floor((currentPage - 1) / 5) * 5 + 1;
  return Array.from({ length: Math.max(0, Math.min(5, totalPages - start + 1)) }, (_, index) => start + index);
}
