import api from "./api";

export async function getMyReviewsApi(page = 0, options = {}) {
  if (!Number.isInteger(page) || page < 0) throw new Error("리뷰 페이지가 올바르지 않습니다.");
  const response = await api.get("/api/mypage/reviews", {
    ...options, params: { page, size: 10 },
  });
  const data = response.data;
  if (!data || !Array.isArray(data.content) ||
      !Number.isSafeInteger(data.totalElements) || data.totalElements < 0 ||
      !Number.isInteger(data.totalPages) || data.totalPages < 0 ||
      data.page !== page || data.content.some(r =>
      !Number.isSafeInteger(r.id) || r.id <= 0 ||
      !Number.isSafeInteger(r.placeId) || r.placeId <= 0 ||
      typeof r.placeName !== "string" ||
      !Array.isArray(r.photos))) {
    throw new Error("내 리뷰 조회 응답을 확인할 수 없습니다.");
  }
  return data;
}

export async function editMyReviewApi(reviewId, { comment, rating }) {
  if (!Number.isSafeInteger(reviewId) || reviewId <= 0 ||
      typeof comment !== "string" || !comment.trim() || comment.trim().length > 255 ||
      !Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("리뷰와 별점을 확인해 주세요.");
  }
  return (await api.patch(`/api/mypage/reviews/${encodeURIComponent(reviewId)}`, {
    comment: comment.trim(), rating,
  })).data;
}

export async function deleteMyReviewApi(reviewId) {
  if (!Number.isSafeInteger(reviewId) || reviewId <= 0) throw new Error("리뷰를 확인해 주세요.");
  return (await api.delete(`/api/mypage/reviews/${encodeURIComponent(reviewId)}`)).data;
}
