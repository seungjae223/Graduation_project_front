import { savePreparedPdf, preparePdfImages, clonePdfContent } from "../utils/pdfTask";
import { logSafeApiError } from "../utils/safeLog";
import React, { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { saveRecentPlace } from "../utils/recentPlaces";
import html2pdf from "html2pdf.js";
import ShareModal from "../ShareModal/ShareModal";
import EarthLoader from "../Loading/EarthLoader";
import "./Detail.css";
import api from "../api/api";
import useReadQuery from "../utils/useReadQuery";
import usePlaceSaving from "../utils/usePlaceSaving";
import PlaceSavingFeedback, { PlaceSaveModal } from "../components/PlaceSavingFeedback";
import FavoriteHeart from "../components/FavoriteHeart";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import { buildLoginPath } from "../utils/authRedirect";
import { getReviewPageApi } from "../api/placeApi";
import { getPlaceEngagementApi } from "../api/placeEngagementApi";
import { useDetailFooter } from "../components/DetailFooterContext";
import { getPlaceCategoryLabel } from "../utils/placeCategory";
import QuickTripAddModal from "../Destinations/QuickTripAddModal";
import { getPlaceDirections } from "../utils/placeDirections";
import { placeImageUrl, resolvePlaceImage } from "../utils/placeImageResolver";

import PlacePhoto from "../components/PlacePhoto";
import { getPlacePhoto } from "../data/placePhotos";

const PLACES_API = "/api/places";
const RECENT_PLACES_API = "/api/recent-places";

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <circle
      cx="18"
      cy="5"
      r="2.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle
      cx="6"
      cy="12"
      r="2.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle
      cx="18"
      cy="19"
      r="2.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M8 11L15.8 6.2M8 13L15.8 17.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M12 20C12 20 6.5 14.86 6.5 10.85C6.5 7.62 9.07 5 12.25 5C15.43 5 18 7.62 18 10.85C18 14.86 12.5 20 12.5 20H12Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle
      cx="12.25"
      cy="10.8"
      r="2.1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <circle
      cx="12"
      cy="8"
      r="3.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M5.5 18.2C6.8 15.7 9 14.5 12 14.5C15 14.5 17.2 15.7 18.5 18.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const SavePlaceIcon = ({ active = false }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      d="M12 20C12 20 6.5 14.86 6.5 10.85C6.5 7.62 9.07 5 12.25 5C15.43 5 18 7.62 18 10.85C18 14.86 12.5 20 12.5 20H12Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M12 15.3s-2.7-1.72-3.74-3.2c-.9-1.27-.58-2.98 1.12-3.34.92-.2 1.72.2 2.24.84.52-.64 1.32-1.04 2.24-.84 1.7.36 2.02 2.07 1.12 3.34C14.7 13.58 12 15.3 12 15.3Z"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);

const SPECIAL_DETAIL_COPY = {
  "담양 죽녹원": {
    address: "전라남도 담양군 담양읍 죽녹원로 119",
    rating: 4.8,
    reviewCount: 1240,
    tags: ["#자연경관", "#산책로", "#가족여행", "#힐링"],
    intro:
      "담양군에서 조성한 약 31만㎡의 울창한 대나무 숲입니다. 죽녹원을 관람하려면 약 2시간 정도가 소요되며, 대나무 사이를 걸으며 바람 소리와 향긋한 숲내음을 천천히 느낄 수 있어요. 산책로가 잘 정비되어 있어 가족 여행이나 가벼운 힐링 코스로도 잘 어울립니다.",
    reviews: [
      {
        id: 1,
        name: "알쁨조아",
        badge: "담양탐험가",
        rating: 5,
        content:
          "공기가 너무 맑고 대나무 숲이 정말 예뻐요. 가족들과 함께 걷기 완벽한 장소입니다!",
      },
      {
        id: 2,
        name: "김민수",
        badge: "주말걷기러",
        rating: 5,
        content:
          "산책로 정비가 잘 되어 있어요. 주말에는 사람이 많으니 평일 방문을 추천합니다.",
      },
    ],
  },
  "제주 사려니숲길": {
    address: "제주특별자치도 제주시 조천읍 비자림로 1115",
    rating: 4.9,
    reviewCount: 980,
    tags: ["#숲체험", "#힐링", "#인생샷", "#트레킹"],
    intro:
      "곧게 뻗은 삼나무 숲길을 따라 걷다 보면 제주 특유의 습하고 싱그러운 공기를 온몸으로 느낄 수 있는 장소입니다. 비교적 완만한 길이 이어져 있어 가볍게 걷기 좋고, 숲의 깊이를 사진으로 담기에도 좋아요.",
  },
  "강릉 안목해변": {
    address: "강원도 강릉시 창해로 14번길 일대",
    rating: 4.7,
    reviewCount: 1130,
    tags: ["#바다", "#카페거리", "#힐숨", "#오션뷰"],
    intro:
      "탁 트인 바다 풍경과 카페거리가 함께 어우러져 여유로운 시간을 보내기 좋은 해변입니다. 산책 후 근처 카페에서 쉬어가기 좋고, 일몰 시간대 풍경도 특히 아름다워요.",
  },
  "양양 서핑비치": {
    address: "강원도 양양군 현남면 새나루길 35",
    rating: 4.8,
    reviewCount: 860,
    tags: ["#서핑", "#바다", "#도전", "#액티비티"],
    intro:
      "초보자도 도전하기 좋은 양양의 대표 서핑 명소입니다. 서핑 강습과 장비 대여가 잘 되어 있어 액티비티 여행을 계획할 때 만족도가 높은 편이에요.",
  },
  "전주 한옥마을 비빔밥집": {
    address: "전라북도 전주시 완산구 은행로 31",
    rating: 4.7,
    reviewCount: 720,
    tags: ["#한식", "#전주", "#필수코스", "#로컬맛집"],
    intro:
      "전주 한옥마을을 둘러본 뒤 한 끼 식사로 들르기 좋은 비빔밥 맛집입니다. 지역 재료를 사용한 정갈한 한식 구성이 여행의 만족도를 높여줘요.",
  },
  "서울 루프탑 카페": {
    address: "서울특별시 용산구 녹사평대로 40길 52",
    rating: 4.7,
    reviewCount: 640,
    tags: ["#야경", "#카페", "#인생샷", "#데이트"],
    intro:
      "도심 야경을 한눈에 내려다볼 수 있는 루프탑 카페입니다. 해 질 무렵 방문하면 노을과 야경을 모두 즐길 수 있어 사진 찍기 좋은 감성 장소예요.",
  },
  "제주 필름무드 스팟": {
    address: "제주특별자치도 서귀포시 남원읍 해안로 233",
    rating: 4.9,
    reviewCount: 540,
    tags: ["#필름감성", "#오션뷰", "#사진명소", "#감성여행"],
    intro:
      "필름 카메라로 찍은 듯한 분위기를 담기 좋은 제주 감성 스팟입니다. 바다와 하늘, 여유로운 동선이 어우러져 천천히 머물기 좋은 장소예요.",
  },
};

const buildFallbackReviews = (place) => [
  {
    id: 1,
    name: "여행좋아",
    badge: "로컬가이드",
    rating: 5,
    content: `${place.title} 분위기가 정말 좋았어요. 사진도 예쁘게 나오고 천천히 둘러보기 좋은 장소였습니다.`,
  },
  {
    id: 2,
    name: "주말산책러",
    badge: "리뷰어",
    rating: 5,
    content:
      "동선에 넣기 좋고 주변 분위기도 만족스러웠어요. 여유 있게 방문하면 더 좋습니다.",
  },
];

const buildFallbackIntro = (place) => {
  const firstTag = place.tags?.[0]?.replace("#", "") || "여행";

  return `${place.title}은(는) ${place.address}에 위치한 매력적인 여행지입니다. ${firstTag} 분위기를 느끼며 여유롭게 둘러보기 좋고, 사진을 남기기에도 좋아 여행 동선에 넣기 편한 장소예요.`;
};

const renderStars = (count = 5) => "★".repeat(count);

const sanitizeFileName = (value = "파일") =>
  value.replace(/[\\/:*?"<>|]/g, "_");

const waitForNextPaint = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });


const createPdfClone = (target) => {
  const rect = target.getBoundingClientRect();
  const pageWidthPx = Math.ceil(rect.width);

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = `${pageWidthPx}px`;
  wrapper.style.background = "#ffffff";
  wrapper.style.pointerEvents = "none";
  wrapper.style.zIndex = "-1";
  wrapper.style.opacity = "1";
  wrapper.style.overflow = "visible";

  const clone = clonePdfContent(target);
  clone.classList.add("is-exporting");
  clone.style.width = `${pageWidthPx}px`;
  clone.style.maxWidth = `${pageWidthPx}px`;
  clone.style.minHeight = "auto";
  clone.style.height = "auto";
  clone.style.margin = "0";
  clone.style.background = "#ffffff";
  clone.style.overflow = "visible";

  clone
    .querySelectorAll(".detail-top-actions, .detail-bottom-bar")
    .forEach((element) => {
      element.remove();
    });

  clone.querySelectorAll(".detail-review-card").forEach((element) => {
    element.style.breakInside = "avoid";
    element.style.pageBreakInside = "avoid";
  });

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  return { wrapper, clone, pageWidthPx };
};

const getResponseData = (data) => {
  if (data?.data) return data.data;
  if (data?.place) return data.place;
  if (data?.destination) return data.destination;
  if (data?.item) return data.item;
  if (data?.result) return data.result;
  if (data?.response) return data.response;

  return data;
};

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];

  return tags
    .map((tag) => {
      const value =
        typeof tag === "string"
          ? tag
          : tag?.name || tag?.tagName || tag?.title || "";

      if (!value) return "";

      return value.startsWith("#") ? value : `#${value}`;
    })
    .filter(Boolean);
};

const toNumber = (value, fallbackValue = 0) => {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallbackValue;
};

const normalizeReviews = (reviews, fallbackPlace) => {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return buildFallbackReviews(fallbackPlace);
  }

  return reviews.map((review, index) => ({
    id: review.id ?? review.reviewId ?? index + 1,
    name:
      review.name || review.nickname || review.userName || review.email || "여행자",
    badge: review.badge || review.level || review.role || "리뷰어",
    rating: review.rating || review.score || 5,
    content:
      review.comment || review.content || review.reviewContent || review.text || "",
  }));
};

const buildDetailTags = (place, special, fallbackPlace) => {
  const placeTags = normalizeTags(place?.tags);
  if (placeTags.length > 0) return placeTags;

  const hashTags = normalizeTags(place?.hashtags);
  if (hashTags.length > 0) return hashTags;

  const fieldTags = normalizeTags(
    [place?.region, place?.theme, place?.placeCategoryLabel || place?.placeCategory].filter(
      Boolean
    )
  );
  if (fieldTags.length > 0) return fieldTags;

  const specialTags = normalizeTags(special?.tags);
  if (specialTags.length > 0) return specialTags;

  const fallbackTags = normalizeTags(fallbackPlace?.tags);
  if (fallbackTags.length > 0) return fallbackTags;

  return ["#추천"];
};

const normalizePlaceDetail = (place, fallbackPlace) => {
  const title =
    place?.name ||
    place?.title ||
    place?.placeName ||
    place?.destinationName ||
    fallbackPlace.title;

  const serverOnly = fallbackPlace === EMPTY_DETAIL_PLACE;
  const special = serverOnly ? {} : SPECIAL_DETAIL_COPY[title] || {};

  const id =
    place?.id ??
    place?.placeId ??
    place?.destinationId ??
    fallbackPlace.id;

  const address =
    place?.address ||
    place?.roadAddress ||
    place?.location ||
    place?.addr ||
    special.address ||
    fallbackPlace.address ||
    "주소 정보 없음";

  const rating = toNumber(
    place?.rating ?? place?.score ?? place?.avgRating ?? special.rating,
    fallbackPlace.rating || 0
  );

  const reviewCount = toNumber(
    place?.reviewCount ??
      place?.reviewsCount ??
      place?.reviewCnt ??
      special.reviewCount,
    fallbackPlace.reviewCount || 0
  );

  const image =
    place?.image ||
    place?.imageUrl ||
    place?.thumbnail ||
    place?.thumbnailUrl ||
    place?.photoUrl ||
    fallbackPlace.image ||
    "";

  const region = place?.region || fallbackPlace.region || "";
  const theme = place?.theme || place?.themeName || fallbackPlace.theme || "";
  const placeCategory = place?.placeCategory || fallbackPlace.placeCategory || "";
  const placeCategoryLabel =
    place?.placeCategoryLabel ||
    fallbackPlace.placeCategoryLabel ||
    "";

  const tags = buildDetailTags(place, special, fallbackPlace);

  const mergedPlace = {
    ...fallbackPlace,
    ...place,
    id,
    title,
    name: title,
    address,
    rating,
    reviewCount,
    image,
    region,
    theme,
    placeCategory,
    placeCategoryLabel,
    tags,
  };

  const intro =
    place?.description ||
    place?.intro ||
    place?.content ||
    place?.summary ||
    special.intro ||
    (serverOnly ? "소개 정보가 없습니다." : buildFallbackIntro(mergedPlace));

  const actualReviews = place?.reviews || place?.reviewList || special.reviews;
  const reviews = serverOnly && !actualReviews?.length ? [] : normalizeReviews(actualReviews, mergedPlace);

  return {
    id,
    title,
    name: title,
    region,
    theme,
    description: place?.description || "",
    address,
    latitude: toNumber(place?.latitude ?? fallbackPlace.latitude, 0),
    longitude: toNumber(place?.longitude ?? fallbackPlace.longitude, 0),
    placeCategory,
    placeCategoryLabel,
    image,
    rating,
    reviewCount,
    tags: tags.length > 0 ? tags : ["#추천"],
    intro,
    reviews,
    originalData: place,
  };
};

const EMPTY_DETAIL_PLACE = {
  id: "",
  title: "",
  name: "",
  address: "",
  region: "",
  theme: "",
  description: "",
  intro: "",
  latitude: 0,
  longitude: 0,
  placeCategory: "",
  placeCategoryLabel: "",
  rating: 0,
  reviewCount: 0,
  image: "",
  tags: [],
  reviews: [],
};

function Detail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const saving = usePlaceSaving();
  const detailFooter = useDetailFooter();
  const setFooterActions = detailFooter?.setActions;

  const idParam = Number(searchParams.get("id"));

  const sessionKey = useSessionKey();
  const requestKey = String(idParam) + ":" + sessionKey;
  const currentTarget = React.useRef(requestKey); currentTarget.current = requestKey;
  const identityMatches = () => getAuthSnapshot().accountKey === sessionKey;
  const validPlace = Number.isInteger(idParam) && idParam > 0;
  const basicQuery = useReadQuery(requestKey, async signal => {
    const response = await api.get(PLACES_API + "/" + idParam, { signal });
    const place = getResponseData(response.data);
    if (!place || Number(place.id) !== idParam || !place.name) throw new Error("장소 응답 오류");
    return { ...normalizePlaceDetail(place, EMPTY_DETAIL_PLACE), hasServerRating: typeof place.rating === "number", serverReviewCount: typeof place.reviewCount === "number" ? place.reviewCount : null };
  }, validPlace, identityMatches);
  const engagementQuery = useReadQuery(requestKey + ":engagement",
    signal => getPlaceEngagementApi([idParam], { signal }), validPlace, identityMatches);
  useEffect(() => {
    if (saving.favoriteStatus === "success") void engagementQuery.retry();
  }, [saving.favoriteStatus, engagementQuery.retry]);
  const likeCount = engagementQuery.data?.[0]?.likeCount ?? null;
  const [reviewPage, setReviewPage] = useState(0);
  const reviewQuery = useReadQuery(requestKey + ":reviewPage:" + reviewPage,
    signal => getReviewPageApi(idParam, reviewPage, { signal }), validPlace, identityMatches);
  const [quickTripPlace, setQuickTripPlace] = useState(null);
  useEffect(() => {
    setReviewPage(0);
    setQuickTripPlace(null);
  }, [requestKey]);

  const detailPlace = {
    ...(basicQuery.data || EMPTY_DETAIL_PLACE),
    reviews: reviewQuery.status === "success" ? reviewQuery.data.content.map(review => ({
      id: review.id, name: review.nickname || review.userName || "여행자",
      badge: "", rating: review.rating, content: review.comment || review.content || "",
      photos: Array.isArray(review.photos) ? review.photos : [],
    })) : [],
  };
  const hasResolvedDetail = basicQuery.data !== null;
  const isLoading = basicQuery.status === "loading";
  const loadError = validPlace ? "장소 상세 정보를 불러오지 못했습니다." : "장소 정보가 없거나 주소가 올바르지 않습니다.";
  const isSavingPlace = saving.busy;
  const [shareModalOpen, setShareModalOpen] = useState(false);
  useEffect(() => { setShareModalOpen(false); }, [requestKey]);
  useEffect(() => {
    if (!detailPlace?.id) {
      return;
    }

    const recentPlace = {
      id: detailPlace.id,
      title: detailPlace.title,
      name: detailPlace.name,
      region: detailPlace.region,
      theme: detailPlace.theme,
      description: detailPlace.description,
      address: detailPlace.address,
      latitude: detailPlace.latitude,
      longitude: detailPlace.longitude,
      placeCategory: detailPlace.placeCategory,
      placeCategoryLabel: detailPlace.placeCategoryLabel,
      rating: detailPlace.rating,
      image: detailPlace.image,
      tags: detailPlace.tags,
      reviewCount: detailPlace.reviewCount,
    };

    saveRecentPlace(recentPlace);

    // Local-only anonymous browsing should not send a guaranteed 401 write.
    if (getAuthSnapshot().accountKey !== "anonymous") {
      api.post(RECENT_PLACES_API, { placeId: detailPlace.id })
        .catch(error => logSafeApiError(error, "Detail.jsx"));
    }
  }, [
    detailPlace.id,
    detailPlace.title,
    detailPlace.name,
    detailPlace.region,
    detailPlace.theme,
    detailPlace.description,
    detailPlace.address,
    detailPlace.latitude,
    detailPlace.longitude,
    detailPlace.placeCategory,
    detailPlace.placeCategoryLabel,
    detailPlace.rating,
    detailPlace.image,
    detailPlace.tags,
    detailPlace.reviewCount,
  ]);

  const saved = saving.isSaved(detailPlace.id);
  const saveDisabled = saving.blocked || saving.folders.status !== "success";
  // Stable map metadata: re-reading favorite or folder state must not rebuild the footer actions.
  const directions = useMemo(() => getPlaceDirections({
    name: detailPlace.name, address: detailPlace.address, region: detailPlace.region,
    latitude: detailPlace.latitude, longitude: detailPlace.longitude,
  }), [detailPlace.name, detailPlace.address, detailPlace.region,
    detailPlace.latitude, detailPlace.longitude]);
  const verifiedPhoto = resolvePlaceImage(detailPlace);
  const heroImage = verifiedPhoto ? placeImageUrl(verifiedPhoto) : detailPlace.image;

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";

    return `${window.location.origin}${location.pathname}?id=${detailPlace.id}`;
  }, [location.pathname, detailPlace.id]);

  const handleOpenFolderPicker = event => {
    if (!saveDisabled) saving.openFolderPicker(event, detailPlace);
  };

  const handleOpenShareModal = () => {
    setShareModalOpen(true);
  };

  // Footer stays mounted during navigation. Keep the current Detail callbacks behind
  // a ref so only validated primitive state updates re-register the action bar.
  const footerCallbacks = React.useRef(null);
  footerCallbacks.current = {
    folder: event => handleOpenFolderPicker(event),
    trip: () => setQuickTripPlace(detailPlace),
  };
  useEffect(() => {
    if (!setFooterActions) return;
    setFooterActions({
      placeId: hasResolvedDetail ? detailPlace.id : null,
      directions: hasResolvedDetail ? directions : null,
      folderDisabled: !hasResolvedDetail || saveDisabled,
      saving: isSavingPlace,
      openFolder: event => footerCallbacks.current?.folder(event),
      openTrip: () => footerCallbacks.current?.trip(),
    });
  }, [setFooterActions, detailPlace.id, hasResolvedDetail, directions, saveDisabled, isSavingPlace]);

  // Clear the shared bar only when Detail unmounts, not after every save-state update.
  useEffect(() => {
    if (!setFooterActions) return undefined;
    return () => setFooterActions(null);
  }, [setFooterActions]);

  const handleSavePdf = async ({ isCurrent = () => true } = {}) => {
    const target = document.getElementById("detail-pdf");

    if (!target) {
      throw new Error("PDF로 저장할 내용을 찾지 못했어요.");
    }

    const pageHeightPx = Math.ceil(window.innerHeight);
    const { wrapper, clone, pageWidthPx } = createPdfClone(target);

    try {
      await waitForNextPaint();
      await preparePdfImages(clone);
      await waitForNextPaint();

      const today = new Date();
      const fileDate = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const options = {
        margin: 0,
        filename: `${sanitizeFileName(detailPlace.title)}_${fileDate}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: [".detail-review-card"],
        },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: pageWidthPx,
          windowHeight: Math.ceil(clone.scrollHeight),
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: {
          unit: "px",
          format: [pageWidthPx, pageHeightPx],
          orientation: "portrait",
          hotfixes: ["px_scaling"],
        },
      };

      const worker = html2pdf().from(clone).set(options);
      await savePreparedPdf(worker, () => isCurrent() && currentTarget.current === requestKey && identityMatches());
    } catch (error) {
      throw error;
    } finally {
      wrapper.remove();
    }
  };

  if (!hasResolvedDetail) {
    if (isLoading) {
      return <EarthLoader text="장소 정보를 불러오는 중..." />;
    }

    return (
      <div className="detail-page">
        <section className="detail-sheet" role="alert"><button type="button" onClick={basicQuery.retry}>상세 다시 불러오기</button>
          <h1 className="detail-title">장소 정보를 표시할 수 없어요</h1>
          <p className="detail-section-text">
            {loadError || "잠시 후 다시 시도해주세요."}
          </p>
          <button
            type="button"
            className="detail-review-more-btn"
            onClick={() => navigate(-1)}
          >
            이전 화면으로 돌아가기
          </button>
        </section>
      </div>
    );
  }

  return (
    <>
      <div id="detail-pdf" className="detail-page">
        <section className="detail-hero">
          {heroImage && <img className="detail-hero-backdrop" src={heroImage} alt="" aria-hidden="true" />}
          <PlacePhoto place={detailPlace} src={detailPlace.image} alt={detailPlace.title} className="detail-hero-image"
            credit={detailPlace.image === getPlacePhoto(detailPlace.title).image ? getPlacePhoto(detailPlace.title).credit : undefined} />

          <div className="detail-top-actions">
            <div className="detail-action-group">
              <button
                type="button"
                className="detail-action-btn"
                onClick={handleOpenShareModal}
                aria-label="공유"
              >
                <ShareIcon />
              </button>

              <div className="detail-favorite-stack">
                <FavoriteHeart place={detailPlace} saving={saving} className="detail-action-btn detail-favorite-heart" />
                {Number.isSafeInteger(likeCount) && likeCount >= 0 &&
                  <span className="detail-favorite-count" aria-label={`${detailPlace.title} 좋아요 ${likeCount}개`}>
                    {likeCount.toLocaleString("ko-KR")}
                  </span>}
              </div>
            </div>
          </div>
        </section>

        <section className="detail-sheet">
          <h1 className="detail-title">
            {isLoading ? "장소 정보를 불러오는 중..." : detailPlace.title}
          </h1>

          <p className="detail-place-meta">{[detailPlace.region, detailPlace.placeCategoryLabel || getPlaceCategoryLabel(detailPlace.placeCategory)].filter(Boolean).join(" · ") || "여행 장소"}</p>
          {basicQuery.data?.hasServerRating && <p className="detail-place-rating">
            <span aria-hidden="true">★</span> {Number(detailPlace.rating).toFixed(1)}
            <span className="detail-place-reviewcount"> · 리뷰 {reviewQuery.status === "success" ? reviewQuery.data.totalElements : basicQuery.data?.serverReviewCount ?? 0}개</span>
          </p>}

          <section className="detail-section">
            <h2 className="detail-section-title">장소 소개</h2>
            <p className="detail-section-text">{detailPlace.intro}</p>
          </section>

          <section className="detail-section detail-facts-section">
            <h2 className="detail-section-title">기본 정보</h2>
            <div className="detail-facts-row"><PinIcon /><div><strong>주소</strong><p>{detailPlace.address}</p></div></div>
          </section>

          <section className="detail-section">
            <div className="detail-review-header">
              <h2 className="detail-section-title">리뷰</h2>

              <div className="detail-review-summary">
                <span className="detail-review-star" aria-hidden="true">★</span>
                <span>{reviewQuery.status === "success"
                  ? reviewQuery.data.totalElements === 0 || reviewQuery.data.averageRating == null
                    ? "평점 미제공" : Number(reviewQuery.data.averageRating).toFixed(1)
                  : basicQuery.data?.serverReviewCount === 0
                    ? "평점 미제공"
                    : basicQuery.data?.hasServerRating ? Number(detailPlace.rating).toFixed(1) : "평점 미제공"}</span>
                <small>
                  ({reviewQuery.status === "success" ? reviewQuery.data.totalElements.toLocaleString("ko-KR")
                    : basicQuery.data?.serverReviewCount != null ? basicQuery.data.serverReviewCount.toLocaleString("ko-KR") : "—"})
                </small>
              </div>
            </div>

            <button type="button" className="detail-review-write-link" onClick={() => {
              const url = `/detail/review?id=${encodeURIComponent(detailPlace.id)}`;
              navigate(sessionKey === "anonymous" ? buildLoginPath(url) : url, { state: { returnState: location.state } });
            }}>리뷰 작성하기 <span aria-hidden="true">→</span></button>

            {reviewQuery.status === "loading" && <p role="status">리뷰를 불러오는 중이에요.</p>}
            {reviewQuery.status === "error" && <div className="detail-review-status" role="alert">
              <p>리뷰를 잠시 불러올 수 없어요.</p>
              <button type="button" className="detail-review-retry" aria-label="리뷰 다시 시도" onClick={reviewQuery.retry}>다시 시도</button>
            </div>}
            {reviewQuery.status === "success" && reviewQuery.data.totalElements === 0 &&
              <div className="detail-review-empty" role="status">
                <p>아직 리뷰가 없어요!</p>
                <span>첫 리뷰를 남겨보세요.</span>
              </div>}
            <div className="detail-review-list">
              {detailPlace.reviews.map((review) => (
                <article key={review.id} className="detail-review-card">
                  <div className="detail-review-top">
                    <div className="detail-review-author">
                      <div className="detail-review-avatar">
                        <UserIcon />
                      </div>

                      <div>
                        <p className="detail-review-name">{review.name}</p>
                        <p className="detail-review-badge">{review.badge}</p>
                      </div>
                    </div>

                    <div className="detail-review-stars">
                      {renderStars(review.rating)}
                    </div>
                  </div>

                  <p className="detail-review-text">{review.content}</p>
                  {review.photos?.length > 0 && <div className="detail-review-photos">
                    {review.photos.map((src, i) => <a key={src} href={src} target="_blank" rel="noreferrer noopener"
                      aria-label={`${review.name} 리뷰 사진 ${i + 1} 크게 보기`}>
                      <img src={src} alt={`${review.name} 리뷰 사진 ${i + 1}`} loading="lazy" />
                    </a>)}
                  </div>}
                </article>
              ))}
            </div>

            {reviewQuery.status === "success" && reviewQuery.data.totalPages > 1 && <nav className="detail-review-pagination" aria-label="리뷰 페이지">
              <button type="button" disabled={reviewPage === 0} onClick={() => setReviewPage(n => n - 1)}>이전</button>
              <span>{reviewPage + 1} / {reviewQuery.data.totalPages}</span>
              <button type="button" disabled={reviewPage + 1 >= reviewQuery.data.totalPages}
                onClick={() => setReviewPage(n => n + 1)}>다음</button>
            </nav>}
          </section>
        </section>

        {!setFooterActions && <div className="detail-bottom-bar">
          {directions ? <a className="detail-save-btn detail-directions-btn" href={directions.url}
            target="_blank" rel="noopener noreferrer" aria-label={`${directions.provider === "kakao" ? "카카오맵" : "구글맵"} 길찾기`}>
            길찾기
          </a> : <span className="detail-save-btn detail-directions-btn detail-unavailable" aria-label="길찾기 지원 지역 확인 필요">
            길찾기 불가
          </span>}
          <button type="button" className={`detail-save-btn ${saved ? "saved" : ""}`}
            onClick={handleOpenFolderPicker} disabled={saveDisabled}>
            <SavePlaceIcon active={saved} />
            <span>{isSavingPlace ? "처리 중..." : "폴더 저장"}</span>
          </button>
          <button type="button" className="detail-save-btn detail-trip-btn" onClick={() => setQuickTripPlace(detailPlace)}>
            일정 추가
          </button>
        </div>}
      </div>

      <PlaceSavingFeedback saving={saving} />
      {sessionKey === "anonymous" && <button type="button" className="detail-query-notice" onClick={() => navigate(buildLoginPath(location.pathname + location.search))}>관심 장소를 저장하려면 로그인해 주세요</button>}
      <ShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        variant="place"
        shareUrl={shareUrl}
        previewTitle={detailPlace.title}
        previewSubtitle={detailPlace.address}
        previewImage={detailPlace.image}
        previewPlace={detailPlace}
        onSavePdf={handleSavePdf}
        contextKey={requestKey}
        exportBlockedReason={basicQuery.status !== "success" || reviewQuery.status !== "success" ? "상세 정보와 리뷰 조회가 완료된 뒤 PDF를 생성할 수 있습니다." : ""}
      />

      <PlaceSaveModal saving={saving} />
      <QuickTripAddModal place={quickTripPlace} onClose={() => setQuickTripPlace(null)} />
    </>
  );
}

export default Detail;
