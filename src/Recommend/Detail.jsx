import React, { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useSavedPlaces } from "../Context/SavedPlacesContext";
import { saveRecentPlace } from "../utils/recentPlaces";
import html2pdf from "html2pdf.js";
import ShareModal from "../ShareModal/ShareModal";
import "./Detail.css";
import api from "../api/api";

import forestImg from "../img/도쿄.png";
import museumImg from "../img/교토.png";
import beachImg from "../img/서비스 소개 .png";

const PLACES_API = "/api/places";
const SAVED_PLACES_API = "/api/saved-places";
const RECENT_PLACES_API = "/api/recent-places";

const BackIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      d="M15 5L8 12L15 19"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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

const HeartIcon = ({ active = false }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      d="M12 21s-6.8-4.35-9.4-8.1C.3 9.55 1.1 5.2 5.4 4.3c2.3-.5 4.3.5 5.6 2.1 1.3-1.6 3.3-2.6 5.6-2.1 4.3.9 5.1 5.25 2.8 8.6C18.8 16.65 12 21 12 21z"
      fill={active ? "#ffffff" : "none"}
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinejoin="round"
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

const PLACE_FALLBACK_BY_ID = {
  101: {
    id: 101,
    title: "포레스트 하우스",
    address: "강원도 평창군",
    rating: 4.9,
    image: forestImg,
    tags: ["#자연힐링", "#조용함"],
  },
  102: {
    id: 102,
    title: "뮤지엄 산",
    address: "경기도 원주시",
    rating: 4.7,
    image: museumImg,
    tags: ["#건축미", "#산책코스"],
  },
  103: {
    id: 103,
    title: "우도 해녀의 집",
    address: "제주 제주시",
    rating: 4.8,
    image: beachImg,
    tags: ["#제주맛집", "#해산물"],
  },
  104: {
    id: 104,
    title: "평창 패러글라이딩",
    address: "강원도 평창군",
    rating: 4.6,
    image: forestImg,
    tags: ["#스릴", "#액티비티"],
  },
  105: {
    id: 105,
    title: "무드 스테이",
    address: "서울 성동구",
    rating: 4.8,
    image: museumImg,
    tags: ["#감성숙소", "#포토스팟"],
  },
  201: {
    id: 201,
    title: "담양 죽녹원",
    address: "전라남도 담양군",
    rating: 4.8,
    image: forestImg,
    tags: ["#자연", "#조용함", "#산책로"],
  },
  202: {
    id: 202,
    title: "제주 사려니숲길",
    address: "제주특별자치도 제주시",
    rating: 4.9,
    image: museumImg,
    tags: ["#숲체험", "#힐링", "#인생샷"],
  },
  203: {
    id: 203,
    title: "강릉 안목해변",
    address: "강원도 강릉시",
    rating: 4.7,
    image: beachImg,
    tags: ["#바다", "#카페거리", "#힐숨"],
  },
  301: {
    id: 301,
    title: "평창 패러글라이딩",
    address: "강원도 평창군",
    rating: 4.6,
    image: forestImg,
    tags: ["#스릴", "#하늘체험", "#액티비티"],
  },
  302: {
    id: 302,
    title: "양양 서핑비치",
    address: "강원도 양양군",
    rating: 4.8,
    image: beachImg,
    tags: ["#서핑", "#바다", "#도전"],
  },
  303: {
    id: 303,
    title: "제주 카트 체험장",
    address: "제주특별자치도 제주시",
    rating: 4.7,
    image: museumImg,
    tags: ["#속도감", "#가족체험", "#실외"],
  },
  401: {
    id: 401,
    title: "우도 해녀의 집",
    address: "제주특별자치도 제주시",
    rating: 4.8,
    image: beachImg,
    tags: ["#제주맛집", "#해산물", "#로컬"],
  },
  402: {
    id: 402,
    title: "전주 한옥마을 비빔밥집",
    address: "전라북도 전주시",
    rating: 4.7,
    image: forestImg,
    tags: ["#한식", "#전주", "#필수코스"],
  },
  403: {
    id: 403,
    title: "부산 해운대 횟집",
    address: "부산광역시 해운대구",
    rating: 4.9,
    image: museumImg,
    tags: ["#회맛집", "#바다뷰", "#신선함"],
  },
  501: {
    id: 501,
    title: "무드 스테이",
    address: "서울 성동구",
    rating: 4.8,
    image: museumImg,
    tags: ["#감성숙소", "#포토스팟", "#무드"],
  },
  502: {
    id: 502,
    title: "서울 루프탑 카페",
    address: "서울 용산구",
    rating: 4.7,
    image: beachImg,
    tags: ["#야경", "#카페", "#인생샷"],
  },
  503: {
    id: 503,
    title: "제주 필름무드 스팟",
    address: "제주특별자치도 서귀포시",
    rating: 4.9,
    image: forestImg,
    tags: ["#필름감성", "#오션뷰", "#사진명소"],
  },
};

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

const waitForImages = async (root) => {
  const images = Array.from(root.querySelectorAll("img"));

  if (!images.length) return;

  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        const done = () => {
          img.removeEventListener("load", done);
          img.removeEventListener("error", done);
          resolve();
        };

        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    })
  );
};

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

  const clone = target.cloneNode(true);
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

  return data;
};

const getArrayData = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.places)) return data.places;
  if (Array.isArray(data?.savedPlaces)) return data.savedPlaces;

  return [];
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

const normalizeReviews = (reviews, fallbackPlace) => {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return buildFallbackReviews(fallbackPlace);
  }

  return reviews.map((review, index) => ({
    id: review.id || review.reviewId || index + 1,
    name: review.name || review.nickname || review.userName || "여행자",
    badge: review.badge || review.level || review.role || "리뷰어",
    rating: review.rating || review.score || 5,
    content: review.content || review.reviewContent || review.text || "",
  }));
};

const normalizePlaceDetail = (place, fallbackPlace) => {
  const special = SPECIAL_DETAIL_COPY[place?.title || place?.name] || {};
  const title =
    place?.title ||
    place?.name ||
    place?.placeName ||
    place?.destinationName ||
    fallbackPlace.title;

  const mergedPlace = {
    ...fallbackPlace,
    ...place,
    title,
    address:
      special.address ||
      place?.address ||
      place?.roadAddress ||
      place?.location ||
      place?.addr ||
      fallbackPlace.address,
    rating:
      special.rating ||
      place?.rating ||
      place?.score ||
      place?.avgRating ||
      fallbackPlace.rating ||
      4.8,
    image:
      place?.image ||
      place?.imageUrl ||
      place?.thumbnail ||
      place?.thumbnailUrl ||
      place?.photoUrl ||
      fallbackPlace.image ||
      forestImg,
    reviewCount:
      special.reviewCount ||
      place?.reviewCount ||
      place?.reviewsCount ||
      place?.reviewCnt ||
      fallbackPlace.reviewCount ||
      0,
    tags:
      (special.tags && special.tags.length > 0 && special.tags) ||
      normalizeTags(place?.tags) ||
      normalizeTags(place?.hashtags) ||
      fallbackPlace.tags ||
      ["#추천"],
  };

  return {
    id: place?.id || place?.placeId || place?.destinationId || fallbackPlace.id,
    title: mergedPlace.title,
    image: mergedPlace.image,
    address: mergedPlace.address,
    rating: mergedPlace.rating,
    reviewCount: mergedPlace.reviewCount,
    tags: mergedPlace.tags.length > 0 ? mergedPlace.tags : ["#추천"],
    intro:
      special.intro ||
      place?.intro ||
      place?.description ||
      place?.content ||
      place?.summary ||
      buildFallbackIntro(mergedPlace),
    reviews:
      special.reviews ||
      normalizeReviews(place?.reviews || place?.reviewList, mergedPlace),
    originalData: place,
  };
};

const getErrorMessage = (error, fallbackMessage) => {
  const data = error.response?.data;

  if (typeof data === "string") {
    return data;
  }

  return data?.message || data?.error || fallbackMessage;
};

function Detail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isSaved, toggleSavedPlace } = useSavedPlaces();

  const idParam = Number(searchParams.get("id"));

  const fallbackDetailPlace = useMemo(() => {
    const placeFromState = location.state?.place;
    const fallbackPlace =
      PLACE_FALLBACK_BY_ID[idParam] || PLACE_FALLBACK_BY_ID[201];

    return normalizePlaceDetail(placeFromState || fallbackPlace, fallbackPlace);
  }, [location.state, idParam]);

  const [detailPlace, setDetailPlace] = useState(fallbackDetailPlace);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingPlace, setIsSavingPlace] = useState(false);
  const [serverSaved, setServerSaved] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  useEffect(() => {
    setDetailPlace(fallbackDetailPlace);
  }, [fallbackDetailPlace]);

  useEffect(() => {
    const fetchPlaceDetail = async () => {
      if (!idParam) return;

      try {
        setIsLoading(true);

        const response = await api.get(`${PLACES_API}/${idParam}`);
        const placeData = getResponseData(response.data);

        setDetailPlace(normalizePlaceDetail(placeData, fallbackDetailPlace));
      } catch (error) {
        console.error("장소 상세 조회 실패:", error);

        if (!error.message.includes("Network Error")) {
          alert(
            getErrorMessage(
              error,
              "장소 상세 정보를 불러오지 못했습니다. 기본 정보를 표시합니다."
            )
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaceDetail();
  }, [idParam, fallbackDetailPlace]);

  useEffect(() => {
    const fetchSavedState = async () => {
      if (!detailPlace?.id) return;

      try {
        const response = await api.get(SAVED_PLACES_API);
        const savedPlaces = getArrayData(response.data);

        const exists = savedPlaces.some((savedPlace) => {
          const placeData = savedPlace.place || savedPlace;
          const savedId =
            placeData.id ||
            placeData.placeId ||
            savedPlace.placeId ||
            savedPlace.savedPlaceId;

          return String(savedId) === String(detailPlace.id);
        });

        setServerSaved(exists);
      } catch (error) {
        console.error("관심 장소 상태 조회 실패:", error);
      }
    };

    fetchSavedState();
  }, [detailPlace.id]);

  useEffect(() => {
    if (!detailPlace?.id) {
      return;
    }

    const recentPlace = {
      id: detailPlace.id,
      title: detailPlace.title,
      address: detailPlace.address,
      rating: detailPlace.rating,
      image: detailPlace.image,
      tags: detailPlace.tags,
      reviewCount: detailPlace.reviewCount,
    };

    saveRecentPlace(recentPlace);

    api
      .post(RECENT_PLACES_API, {
        placeId: detailPlace.id,
      })
      .catch((error) => {
        console.error("최근 본 장소 서버 저장 실패:", error);
      });
  }, [
    detailPlace.id,
    detailPlace.title,
    detailPlace.address,
    detailPlace.rating,
    detailPlace.image,
    detailPlace.tags,
    detailPlace.reviewCount,
  ]);

  const contextSaved = isSaved(detailPlace.id);
  const saved = serverSaved || contextSaved;

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";

    return `${window.location.origin}${location.pathname}?id=${detailPlace.id}`;
  }, [location.pathname, detailPlace.id]);

  const handleToggleSaved = async () => {
    if (isSavingPlace) return;

    const savedPlacePayload = {
      id: detailPlace.id,
      title: detailPlace.title,
      address: detailPlace.address,
      rating: detailPlace.rating,
      image: detailPlace.image,
      tags: detailPlace.tags,
    };

    try {
      setIsSavingPlace(true);

      if (saved) {
        await api.delete(`${SAVED_PLACES_API}/${detailPlace.id}`);

        setServerSaved(false);

        if (contextSaved) {
          toggleSavedPlace(savedPlacePayload);
        }

        return;
      }

      await api.post(SAVED_PLACES_API, {
        placeId: detailPlace.id,
      });

      setServerSaved(true);

      if (!contextSaved) {
        toggleSavedPlace(savedPlacePayload);
      }
    } catch (error) {
      console.error("관심 장소 변경 실패:", error);

      if (error.message.includes("Network Error")) {
        alert("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
        return;
      }

      alert(
        getErrorMessage(
          error,
          "관심 장소 변경에 실패했습니다. 잠시 후 다시 시도해주세요."
        )
      );
    } finally {
      setIsSavingPlace(false);
    }
  };

  const handleOpenShareModal = () => {
    setShareModalOpen(true);
  };

  const handleSavePdf = async () => {
    const target = document.getElementById("detail-pdf");

    if (!target) {
      alert("PDF로 저장할 내용을 찾지 못했어요.");
      return;
    }

    const pageHeightPx = Math.ceil(window.innerHeight);
    const { wrapper, clone, pageWidthPx } = createPdfClone(target);

    try {
      await waitForNextPaint();
      await waitForImages(clone);
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

      await html2pdf().from(clone).set(options).save();
    } catch (error) {
      console.log("PDF 저장 실패:", error);
      alert("PDF 저장에 실패했어요.");
    } finally {
      wrapper.remove();
    }
  };

  return (
    <>
      <div id="detail-pdf" className="detail-page">
        <section className="detail-hero">
          <img
            src={detailPlace.image}
            alt={detailPlace.title}
            className="detail-hero-image"
          />

          <div className="detail-top-actions">
            <button
              type="button"
              className="detail-action-btn"
              onClick={() => navigate(-1)}
              aria-label="뒤로가기"
            >
              <BackIcon />
            </button>

            <div className="detail-action-group">
              <button
                type="button"
                className="detail-action-btn"
                onClick={handleOpenShareModal}
                aria-label="공유"
              >
                <ShareIcon />
              </button>

              <button
                type="button"
                className="detail-action-btn"
                onClick={handleToggleSaved}
                disabled={isSavingPlace}
                aria-label={saved ? "관심 장소 해제" : "관심 장소 추가"}
              >
                <HeartIcon active={saved} />
              </button>
            </div>
          </div>
        </section>

        <section className="detail-sheet">
          <h1 className="detail-title">
            {isLoading ? "장소 정보를 불러오는 중..." : detailPlace.title}
          </h1>

          <div className="detail-location-row">
            <PinIcon />
            <span>{detailPlace.address}</span>
          </div>

          <div className="detail-tag-row">
            {detailPlace.tags.map((tag) => (
              <span key={tag} className="detail-tag">
                {tag}
              </span>
            ))}
          </div>

          <section className="detail-section">
            <h2 className="detail-section-title">장소 소개</h2>
            <p className="detail-section-text">{detailPlace.intro}</p>
          </section>

          <section className="detail-section">
            <div className="detail-review-header">
              <h2 className="detail-section-title">방문자 리뷰</h2>

              <div className="detail-review-summary">
                <span className="detail-review-star">★</span>
                <span>{Number(detailPlace.rating).toFixed(1)}</span>
                <small>
                  ({Number(detailPlace.reviewCount).toLocaleString("ko-KR")})
                </small>
              </div>
            </div>

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
                </article>
              ))}
            </div>

            <button type="button" className="detail-review-more-btn">
              리뷰 더보기
            </button>
          </section>
        </section>

        <div className="detail-bottom-bar">
          <button
            type="button"
            className={`detail-save-btn ${saved ? "saved" : ""}`}
            onClick={handleToggleSaved}
            disabled={isSavingPlace}
          >
            <SavePlaceIcon active={saved} />
            <span>
              {isSavingPlace
                ? "처리 중..."
                : saved
                ? "관심 장소에 저장됨"
                : "관심 장소에 추가하기"}
            </span>
          </button>
        </div>
      </div>

      <ShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        variant="place"
        shareUrl={shareUrl}
        previewTitle={detailPlace.title}
        previewSubtitle={detailPlace.address}
        previewImage={detailPlace.image}
        onSavePdf={handleSavePdf}
      />
    </>
  );
}

export default Detail;