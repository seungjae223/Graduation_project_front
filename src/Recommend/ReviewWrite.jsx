import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { createReviewApi, createReviewWithPhotosApi, getPlaceApi } from "../api/placeApi";
import { buildLoginPath } from "../utils/authRedirect";
import useSessionKey from "../utils/useSessionKey";
import "./ReviewWrite.css";
import { prepareReviewPhoto, validatePhotoSelection } from "../utils/reviewPhotoProcessing";

export default function ReviewWrite() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const session = useSessionKey();
  const id = Number(params.get("id"));
  const validId = Number.isSafeInteger(id) && id > 0;
  const [placeName, setPlaceName] = useState("");
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [photos, setPhotos] = useState([]);
  const [preparing, setPreparing] = useState(false);
  const fileInput = useRef(null);
  const activePhotoUrls = useRef(new Set());
  const requestInFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let current = true;
    setPlaceName(""); setScore(0); setComment(""); setNotice(""); setPhotos([]);
    if (validId) getPlaceApi(id).then(place => {
      if (current && Number(place?.id) === id) setPlaceName(place.name || "");
    }).catch(() => { /* Submission can still proceed if the title request fails. */ });
    return () => { current = false; };
  }, [id, validId]);

  useEffect(() => {
    const urls = activePhotoUrls.current;
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); };
  }, []);

  const choosePhotos = async event => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const prepared = [];
    try {
      validatePhotoSelection(files, photos.length);
      setPreparing(true); setNotice("");
      for (const file of files) {
        const optimized = await prepareReviewPhoto(file);
        const url = URL.createObjectURL(optimized);
        activePhotoUrls.current.add(url);
        prepared.push({ file: optimized, url });
      }
      if (!mounted.current) {
        prepared.forEach(item => { URL.revokeObjectURL(item.url); activePhotoUrls.current.delete(item.url); });
        return;
      }
      setPhotos(current => current.concat(prepared));
    } catch (error) {
      prepared.forEach(item => { URL.revokeObjectURL(item.url); activePhotoUrls.current.delete(item.url); });
      if (mounted.current) setNotice(error.message || "사진을 처리할 수 없어요.");
    } finally {
      if (mounted.current) setPreparing(false);
    }
  };
  const removePhoto = index => {
    const removed = photos[index];
    setPhotos(current => current.filter((_, i) => i !== index));
    if (removed) { activePhotoUrls.current.delete(removed.url); URL.revokeObjectURL(removed.url); }
  };
  const submit = async event => {
    event.preventDefault();
    if (!validId || score < 1 || score > 5 || !comment.trim() || submitting || preparing || requestInFlight.current || session === "anonymous") return;
    requestInFlight.current = true;
    setSubmitting(true); setNotice("");
    try {
      if (photos.length) {
        await createReviewWithPhotosApi({ placeId: id, comment: comment.trim(), rating: score,
          photos: photos.map(item => item.file) });
      } else {
        await createReviewApi({ placeId: id, comment: comment.trim(), rating: score });
      }
      if (mounted.current) navigate(`/detail?id=${id}`, { replace: true, state: location.state?.returnState || null });
    } catch (error) {
      if (mounted.current) setNotice(error?.response?.status === 409
        ? "이미 이 장소에 리뷰를 작성했어요. 마이페이지에서 기존 리뷰를 수정해 주세요."
        : error?.response?.status === 503
        ? "리뷰 사진 저장소가 설정되지 않았어요. 운영자에게 문의해 주세요."
        : error?.response?.status === 413
          ? "사진 크기가 너무 커요. 사진을 줄여 다시 시도해 주세요."
          : "등록 결과를 확인하지 못했어요. 중복 등록 전 리뷰 목록을 확인해 주세요.");
    } finally {
      requestInFlight.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  if (!validId) return <main className="review-write-page"><p role="alert">장소 번호가 올바르지 않아요.</p>
    <button type="button" onClick={() => navigate("/search")}>검색으로 돌아가기</button></main>;

  return <main className="review-write-page">
    <h1>리뷰 작성</h1>
    <p className="review-write-place">{placeName || "선택한 장소"}</p>
    {session === "anonymous" ? <button type="button" className="review-write-login"
      onClick={() => navigate(buildLoginPath(location.pathname + location.search))}>로그인하고 리뷰 작성하기</button> :
      <form onSubmit={submit}>
        <fieldset className="review-write-rating" disabled={submitting}>
          <legend>별점 선택</legend>
          <div className="review-write-stars" role="group" aria-label="별점 선택">
            {[1,2,3,4,5].map(value => <button key={value} type="button" className={value <= score ? "selected" : ""}
              aria-label={`${value}점`} aria-pressed={score === value} onClick={() => setScore(value)}>
              <span aria-hidden="true">{value <= score ? "★" : "☆"}</span>
            </button>)}
          </div>
          <p className="review-write-help">{score ? `${score}점 선택됨` : "별을 눌러 평점을 선택해 주세요."}</p>
        </fieldset>
        <label htmlFor="review-write-comment">방문 후기</label>
        <textarea id="review-write-comment" rows={4} value={comment} maxLength={255} disabled={submitting}
          onChange={event => setComment(event.target.value)} placeholder="장소에서의 경험을 나눠주세요." />
        <p className="review-write-count">{comment.length} / 255</p>
        <section className="review-write-media" aria-label="리뷰 사진">
          <div className="review-write-media-heading"><strong>사진 첨부</strong><span>{photos.length}/5</span></div>
          <p>JPEG · PNG · WebP, 최대 5장. 사진은 업로드 전에 자동으로 용량을 줄여요.</p>
          <input ref={fileInput} tabIndex={-1} className="review-write-file-input" type="file"
            accept="image/jpeg,image/png,image/webp" multiple
            aria-label="리뷰 사진 선택" onChange={choosePhotos}
            disabled={submitting || preparing || photos.length === 5} />
          <button type="button" className="review-write-add-photo"
            onClick={() => fileInput.current?.click()}
            disabled={submitting || preparing || photos.length === 5}>
            <span className="review-write-add-photo-icon" aria-hidden="true">+</span>
            {photos.length === 5 ? "사진 5장 첨부됨" : "사진 추가"}
          </button>
          <div className="review-write-media-grid">
            {photos.map((item, i) => <div className="review-write-media-thumb" key={item.url}>
              <img src={item.url} alt={`선택한 사진 ${i + 1}`} />
              <button type="button" aria-label={`사진 ${i + 1} 삭제`} disabled={submitting || preparing}
                onClick={() => removePhoto(i)}>×</button>
            </div>)}
          </div>
          {preparing && <p role="status">사진을 최적화하는 중이에요...</p>}
          <p className="review-write-media-note">동영상 첨부는 추후 제공할 예정이에요.</p>
        </section>
        {notice && <p role="alert">{notice}</p>}
        <button type="submit" className="review-write-submit" disabled={submitting || preparing || score === 0 || !comment.trim()}>
          {submitting ? "등록 중..." : "리뷰 등록"}
        </button>
      </form>}
  </main>;
}
