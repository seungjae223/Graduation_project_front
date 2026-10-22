import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import useReadQuery from "../utils/useReadQuery";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import { getPlacePhoto } from "../data/placePhotos";
import PlacePhoto from "../components/PlacePhoto";
import { deleteMyReviewApi, editMyReviewApi, getMyReviewsApi } from "../api/myReviewsApi";
import { getApiErrorMessage } from "../api/api";
import "./MyPage.css";

const stars = [1,2,3,4,5];

// A photo URL can be present yet its public bucket can still return 403/404.
function ReviewPhotoStrip({ urls }) {
  const [failed, setFailed] = useState([]);
  const visible = urls.filter(url => !failed.includes(url));
  return <div className="mypage-v14-review-photo-area">
    {visible.length > 0 && <div className="mypage-v14-review-photos">
      {visible.map(url => <img key={url} src={url} alt="작성한 리뷰 첨부 사진"
        loading="lazy" onError={()=>setFailed(old=>old.includes(url)?old:[...old,url])} />)}
    </div>}
    {failed.length > 0 && <p className="mypage-v14-photo-warning" role="status">
      첨부 사진을 불러오지 못했어요. 사진 저장소 접근 권한과 공개 주소를 확인해 주세요.
    </p>}
  </div>;
}

export default function MyReviews() {
  const account = useSessionKey();
  const [page, setPage] = useState(0);
  const query = useReadQuery(`${account}:my-reviews:${page}`,
    signal => getMyReviewsApi(page, { signal }), account !== "anonymous",
    () => getAuthSnapshot().accountKey === account);
  const data = query.data;
  const lock = useRef(false);
  const [edit, setEdit] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const runAction = async (write, verify) => {
    if (lock.current || query.status !== "success") return false;
    lock.current = true;
    setBusy(true); setNotice("");
    try {
      await write();
      if (getAuthSnapshot().accountKey !== account) return false;
      const refreshed = await query.read();
      if (!verify(refreshed)) {
        setNotice("변경 요청 후 최신 리뷰를 확인하지 못했어요. 다시 요청하지 말고 목록을 재조회해 주세요.");
        return false;
      }
      return true;
    } catch (error) {
      if (getAuthSnapshot().accountKey !== account) return false;
      const uncertain = !error?.response || Number(error.response.status) >= 500;
      setNotice(uncertain
        ? "요청 결과를 확인하지 못했어요. 변경을 반복하지 말고 최신 리뷰 목록부터 확인해 주세요."
        : getApiErrorMessage(error, "리뷰 변경에 실패했어요."));
      return false;
    } finally {
      lock.current = false;
      if (getAuthSnapshot().accountKey === account) setBusy(false);
    }
  };

  const submitEdit = async event => {
    event.preventDefault();
    if (!edit || busy || edit.comment.trim().length < 1 ||
        edit.comment.trim().length > 255 || edit.rating < 1 || edit.rating > 5) return;
    const wanted = { ...edit, comment: edit.comment.trim() };
    const applied = await runAction(
      () => editMyReviewApi(wanted.id, { comment: wanted.comment, rating: wanted.rating }),
      updated => updated?.content?.some(row => row.id === wanted.id &&
        row.comment === wanted.comment && row.rating === wanted.rating));
    if (applied) { setEdit(null); setNotice("리뷰를 수정했어요."); }
  };
  const removeReview = async review => {
    if (busy || !window.confirm(`"${review.placeName}" 리뷰를 삭제할까요? 첨부 사진도 함께 삭제됩니다.`)) return;
    const oldTotal = data?.totalElements;
    const applied = await runAction(
      () => deleteMyReviewApi(review.id),
      updated => updated && updated.totalElements === oldTotal - 1 &&
        !updated.content.some(row => row.id === review.id));
    if (applied) {
      setEdit(null); setNotice("리뷰를 삭제했어요.");
      if (page > 0 && data?.content?.length === 1) setPage(value => value - 1);
    }
  };

  return <main className="mypage-v14 mypage-v14-subpage">
    <header className="mypage-v14-pagehead">
      <h1>작성한 리뷰</h1>
    </header>
    {query.status === "loading" && !data && <p role="status">작성한 리뷰를 불러오는 중...</p>}
    {query.status === "error" && <div role="alert" className="mypage-v14-message">
      {data ? "최신 리뷰를 확인하지 못했어요." : "작성한 리뷰를 불러오지 못했어요."}
      <button type="button" onClick={query.retry}>다시 조회</button>
    </div>}
    {notice && <div className="mypage-v14-message" role="status">
      {notice} <button type="button" onClick={query.retry}>최신 목록 확인</button>
    </div>}
    {data && <>
      <p className="mypage-v14-summary">작성한 리뷰 {data.totalElements}개</p>
      {data.totalElements === 0
        ? <div className="mypage-v14-empty">아직 작성한 리뷰가 없어요.
            <Link to="/recommend">여행지 둘러보기</Link>
          </div>
        : <ul className="mypage-v14-reviews mypage-v14-review-cards">
          {data.content.map(review => <li key={review.id}>
            <div className="mypage-v14-review-card-head">
              <PlacePhoto place={{ placeId: review.placeId, name: review.placeName,
                region: review.region, latitude: review.latitude, longitude: review.longitude,
                address: review.address }}
                src={getPlacePhoto(review.placeName).image}
                alt={review.placeName} className="mypage-v14-review-thumbnail" />
              <div className="mypage-v14-review-card-title">
                <Link to={`/detail?id=${encodeURIComponent(review.placeId)}`}>{review.placeName}</Link>
                <span className="mypage-v14-review-stars" aria-label={`별점 ${review.rating}점`}>
                  {stars.map(n => <span key={n} className={n <= review.rating ? "filled" : ""}>★</span>)}
                  <small>{Number(review.rating).toFixed(1)}</small>
                </span>
                {(review.region || review.placeCategoryLabel) &&
                  <small>{[review.region, review.placeCategoryLabel].filter(Boolean).join(" · ")}</small>}
              </div>
            </div>
            {edit?.id === review.id ? <form className="mypage-v14-review-edit" onSubmit={submitEdit}>
              <fieldset className="mypage-v14-edit-stars" disabled={busy}>
                <legend>별점 선택</legend>
                <div className="mypage-v14-edit-star-buttons" role="group" aria-label="별점 선택">
                  {stars.map(n=><button key={n} type="button"
                    className={n <= edit.rating ? "selected" : ""}
                    aria-label={`${n}점`} aria-pressed={edit.rating === n}
                    onClick={()=>setEdit(old=>({...old,rating:n}))}>
                    <span aria-hidden="true">{n <= edit.rating ? "★" : "☆"}</span>
                  </button>)}
                </div>
                <p>{edit.rating}점 선택됨</p>
              </fieldset>
              <label htmlFor={`comment-${review.id}`}>리뷰 내용</label>
              <textarea id={`comment-${review.id}`} value={edit.comment}
                maxLength={255} rows={4} disabled={busy}
                onChange={e=>setEdit(old=>({...old,comment:e.target.value}))} />
              <small>{edit.comment.length}/255자 · 첨부 사진은 그대로 유지됩니다.</small>
              <div className="mypage-v14-review-actions">
                <button type="button" disabled={busy} onClick={()=>setEdit(null)}>취소</button>
                <button type="submit" disabled={busy || !edit.comment.trim()}>수정 저장</button>
              </div>
            </form> : <>
              <p>{review.comment}</p>
              {review.photos.length > 0 && <ReviewPhotoStrip urls={review.photos} />}
              {review.photosUnavailable && <p className="mypage-v14-photo-warning" role="status">
                첨부 사진 주소를 확인하지 못했어요. 리뷰 내용은 정상적으로 표시됩니다.
              </p>}
              <div className="mypage-v14-review-actions">
                <Link to={`/detail?id=${encodeURIComponent(review.placeId)}`}>장소 상세 보기 →</Link>
                <button type="button" disabled={busy} onClick={()=>{setNotice("");setEdit({
                  id:review.id,comment:review.comment,rating:review.rating});}}>수정</button>
                <button type="button" className="is-danger" disabled={busy}
                  onClick={()=>removeReview(review)}>삭제</button>
              </div>
            </>}
          </li>)}
        </ul>}
      {data.totalPages > 1 && <nav className="mypage-v14-pager" aria-label="내 리뷰 페이지">
        <button type="button" disabled={page === 0 || busy} onClick={() => {setEdit(null);setPage(p => p - 1);}}>이전</button>
        <span>{page + 1} / {data.totalPages}</span>
        <button type="button" disabled={page >= data.totalPages - 1 || busy}
          onClick={() => {setEdit(null);setPage(p => p + 1);}}>다음</button>
      </nav>}
    </>}
  </main>;
}
