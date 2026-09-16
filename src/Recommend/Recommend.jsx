import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSavedPlaces } from "../Context/SavedPlacesContext";
import AnimatedHeart from "../AnimatedHeart/AnimatedHeart";
import FolderSelectModal from "../FolderSelectModal/FolderSelectModal";
import "./Recommend.css";
import api from "../api/api";

import forestImg from "../img/도쿄.png"; // 기본 이미지(Fallback)로 사용됨
import healingThemeIcon from "../img/흰색 나뭇잎.png";
import activityThemeIcon from "../img/검은색 액티비티.png";
import foodThemeIcon from "../img/검은색 맛집.png";
import photoThemeIcon from "../img/검은색 카메라.png";

const RECOMMENDATIONS_API = "/api/recommendations";
const FOLDERS_API = "/api/folders";
const PLACES_API = "/api/places";
const ITEMS_PER_PAGE = 5;
const PAGE_NUMBER_COUNT = 3; // 이전/다음 버튼까지 합쳐서 한 줄에 총 5개만 표시

const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M12 20C12 20 6 14.5 6 10.5C6 7.46 8.46 5 11.5 5C14.54 5 17 7.46 17 10.5C17 14.5 12 20 12 20Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle
      cx="11.5"
      cy="10.5"
      r="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  </svg>
);

// key는 DB에 저장된 theme 값, label은 화면에 보여줄 한글 값
const themeCards = [
  { key: "healing", label: "힐링", icon: healingThemeIcon, tone: "light" },
  { key: "activity", label: "액티비티", icon: activityThemeIcon },
  { key: "food", label: "맛집 탐방", icon: foodThemeIcon },
  { key: "photo", label: "인스타 감성", icon: photoThemeIcon },
];

const cityKeywordAliases = {
  도쿄: ["도쿄", "동경", "tokyo"],
  tokyo: ["도쿄", "동경", "tokyo"],
  오사카: ["오사카", "osaka"],
  osaka: ["오사카", "osaka"],
  교토: ["교토", "kyoto"],
  kyoto: ["교토", "kyoto"],
  나라: ["나라", "nara"],
  nara: ["나라", "nara"],
  후쿠오카: ["후쿠오카", "fukuoka"],
  fukuoka: ["후쿠오카", "fukuoka"],
  삿포로: ["삿포로", "sapporo"],
  sapporo: ["삿포로", "sapporo"],
};

const normalizeSearchText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "");

const getSearchKeywordCandidates = (keyword) => {
  const normalizedKeyword = normalizeSearchText(keyword);
  const aliases = cityKeywordAliases[normalizedKeyword];

  if (!aliases) {
    return [normalizedKeyword];
  }

  return aliases.map(normalizeSearchText);
};

const matchesSearchKeyword = (place, keyword) => {
  const keywordCandidates = getSearchKeywordCandidates(keyword);

  if (keywordCandidates.length === 0 || !keywordCandidates[0]) {
    return true;
  }

  const searchableText = normalizeSearchText(
    [
      place.title,
      place.description,
      place.address,
      place.theme,
      place.badge,
      place.placeType,
      place.tabType,
      ...(place.tags || []),
    ].join(" ")
  );

  return keywordCandidates.some((candidate) =>
    searchableText.includes(candidate)
  );
};

const getArrayData = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.places)) return data.places;
  if (Array.isArray(data?.folders)) return data.folders;
  if (Array.isArray(data?.recommendations)) return data.recommendations;
  if (Array.isArray(data?.savedPlaces)) return data.savedPlaces;
  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.places)) return data.data.places;
  if (Array.isArray(data?.data?.folders)) return data.data.folders;
  if (Array.isArray(data?.data?.recommendations)) return data.data.recommendations;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.results)) return data.results;

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

const getTabType = (place) => {
  const rawType = String(
    place.tabType ||
      place.category ||
      place.categoryName ||
      place.type ||
      place.placeType ||
      ""
  );

  if (rawType.includes("맛") || rawType.toLowerCase().includes("restaurant")) {
    return "맛집";
  }

  if (
    rawType.includes("숙") ||
    rawType.toLowerCase().includes("stay") ||
    rawType.toLowerCase().includes("hotel")
  ) {
    return "숙소";
  }

  return rawType || "명소";
};

const normalizePlace = (place, selectedTheme, index = 0) => {
  const theme = place.theme || place.themeName || selectedTheme;
  const tabType = getTabType(place);
  const placeType = place.placeType || place.category || tabType;
  const id = place.id ?? place.placeId ?? place.destinationId ?? `place-${index}`;

  return {
    id,
    theme,
    title:
      place.name ||
      place.title ||
      place.placeName ||
      place.destinationName ||
      "장소 이름 없음",
    description: place.description || "",
    address:
      place.address ||
      place.roadAddress ||
      place.location ||
      place.addr ||
      "주소 정보 없음",
    latitude: Number(place.latitude ?? 0),
    longitude: Number(place.longitude ?? 0),
    rating: place.rating || place.score || place.avgRating || 0,
    reviewCount: place.reviewCount || place.reviewsCount || place.reviewCnt || 0,
    badge: place.badge || place.badgeText || placeType || "PLACE",
    placeType,
    tabType,
    image:
      place.image ||
      place.imageUrl ||
      place.thumbnail ||
      place.thumbnailUrl ||
      place.photoUrl ||
      forestImg,
    tags: normalizeTags(
      place.tags || place.hashtags || [theme, placeType].filter(Boolean)
    ),
    originalData: place,
  };
};

const getSavedPlaceId = (savedPlace) => {
  const placeData = savedPlace.place || savedPlace.destination || savedPlace;

  return (
    placeData.id ??
    placeData.placeId ??
    savedPlace.placeId ??
    savedPlace.savedPlaceId ??
    savedPlace.bookmarkId ??
    savedPlace.id
  );
};

const getFolderId = (folder) => {
  return folder?.id ?? folder?.folderId ?? folder?.folder_id ?? null;
};

const getFolderPlacesUrl = (folderId) => {
  return `${FOLDERS_API}/${encodeURIComponent(folderId)}/places`;
};

const getFolderPlaceDeleteUrl = (folderId, placeId) => {
  return `${FOLDERS_API}/${encodeURIComponent(
    folderId
  )}/places/${encodeURIComponent(placeId)}`;
};

const getUniqueTextArray = (values) => {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))];
};

const getErrorMessage = (error, fallbackMessage) => {
  const data = error.response?.data;

  if (typeof data === "string") {
    return data;
  }

  return data?.message || data?.error || fallbackMessage;
};

function Recommend() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isSaved, toggleSavedPlace } = useSavedPlaces();

  const searchKeyword = (searchParams.get("keyword") || "").trim();
  const isSearchMode = searchKeyword.length > 0;

  const [selectedTheme, setSelectedTheme] = useState("healing");
  const [recommendedPlaces, setRecommendedPlaces] = useState([]);
  const [serverSavedIds, setServerSavedIds] = useState([]);
  const [serverSavedFolderMap, setServerSavedFolderMap] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingId, setIsSavingId] = useState(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderTargetPlace, setFolderTargetPlace] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTheme, searchKeyword]);

  useEffect(() => {
    const fetchRecommendedPlaces = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        let response;

        if (isSearchMode) {
          try {
            response = await api.get(PLACES_API, {
              params: {
                keyword: searchKeyword,
              },
            });
          } catch (placeSearchError) {
            if (placeSearchError.message.includes("Network Error")) {
              throw placeSearchError;
            }

            response = await api.get(RECOMMENDATIONS_API, {
              params: {
                keyword: searchKeyword,
              },
            });
          }
        } else {
          response = await api.get(RECOMMENDATIONS_API, {
            params: {
              theme: selectedTheme,
            },
          });
        }

        let places = getArrayData(response.data).map((place, index) =>
          normalizePlace(place, selectedTheme, index)
        );

        if (isSearchMode) {
          places = places.filter((place) =>
            matchesSearchKeyword(place, searchKeyword)
          );
        }

        setRecommendedPlaces(places);
      } catch (error) {
        console.error("추천 장소 조회 실패:", error);

        if (error.message.includes("Network Error")) {
          setErrorMessage("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
          return;
        }

        setErrorMessage(
          getErrorMessage(
            error,
            isSearchMode
              ? "검색 결과를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
              : "추천 장소를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
          )
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendedPlaces();
  }, [selectedTheme, searchKeyword, isSearchMode]);

  const loadSavedPlaceState = async () => {
    try {
      const folderResponse = await api.get(FOLDERS_API);
      const folders = getArrayData(folderResponse.data);
      const savedIds = [];
      const savedFolderMap = {};

      const placeResponses = await Promise.allSettled(
        folders
          .map((folder) => getFolderId(folder))
          .filter((folderId) => folderId !== null && folderId !== undefined)
          .map(async (folderId) => {
            const response = await api.get(getFolderPlacesUrl(folderId));

            return {
              folderId: String(folderId),
              places: getArrayData(response.data),
            };
          })
      );

      placeResponses.forEach((result) => {
        if (result.status !== "fulfilled") return;

        const { folderId, places: folderPlaces } = result.value;

        folderPlaces.forEach((savedPlace) => {
          const placeId = getSavedPlaceId(savedPlace);

          if (!placeId) return;

          const placeIdText = String(placeId);
          savedIds.push(placeIdText);

          savedFolderMap[placeIdText] = getUniqueTextArray([
            ...(savedFolderMap[placeIdText] || []),
            folderId,
          ]);
        });
      });

      const nextSavedIds = [...new Set(savedIds)];

      setServerSavedIds(nextSavedIds);
      setServerSavedFolderMap(savedFolderMap);

      return {
        savedIds: nextSavedIds,
        savedFolderMap,
      };
    } catch (error) {
      console.error("저장 장소 상태 조회 실패:", error);
      setServerSavedIds([]);
      setServerSavedFolderMap({});

      return {
        savedIds: [],
        savedFolderMap: {},
      };
    }
  };

  useEffect(() => {
    loadSavedPlaceState();
  }, []);

  const totalPages = Math.max(
    1,
    Math.ceil(recommendedPlaces.length / ITEMS_PER_PAGE)
  );

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPlaces = recommendedPlaces.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const halfPageNumberCount = Math.floor(PAGE_NUMBER_COUNT / 2);
  let firstVisiblePage = Math.max(1, currentPage - halfPageNumberCount);
  let lastVisiblePage = Math.min(
    totalPages,
    firstVisiblePage + PAGE_NUMBER_COUNT - 1
  );

  if (lastVisiblePage - firstVisiblePage + 1 < PAGE_NUMBER_COUNT) {
    firstVisiblePage = Math.max(1, lastVisiblePage - PAGE_NUMBER_COUNT + 1);
  }

  const visiblePageNumbers = Array.from(
    { length: lastVisiblePage - firstVisiblePage + 1 },
    (_, index) => firstVisiblePage + index
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
  };

  const handleViewAll = () => {
    const params = new URLSearchParams();

    if (isSearchMode) {
      params.set("keyword", searchKeyword);
    } else {
      params.set("theme", selectedTheme);
    }

    navigate(`/total?${params.toString()}`);
  };

  const handleDetailClick = (place) => {
    navigate(`/detail?id=${place.id}`, {
      state: { place },
    });
  };

  const closeFolderModal = () => {
    if (isSavingId) return;

    setIsFolderModalOpen(false);
    setFolderTargetPlace(null);
  };

  const postPlaceToFolder = async (placeId, folder) => {
    if (!placeId) {
      throw new Error("장소 ID가 없습니다.");
    }

    if (!folder?.id) {
      throw new Error("폴더 ID가 없습니다.");
    }

    return api.post(getFolderPlacesUrl(folder.id), {
      placeId,
    });
  };

  const removeSavedPlace = async (place) => {
    try {
      setIsSavingId(place.id);

      const placeIdText = String(place.id);
      let folderIds = serverSavedFolderMap[placeIdText] || [];

      if (folderIds.length === 0) {
        const latestSavedState = await loadSavedPlaceState();
        folderIds = latestSavedState.savedFolderMap[placeIdText] || [];
      }

      if (folderIds.length > 0) {
        const deleteResults = await Promise.allSettled(
          getUniqueTextArray(folderIds).map((folderId) =>
            api.delete(getFolderPlaceDeleteUrl(folderId, place.id))
          )
        );

        const failedResult = deleteResults.find(
          (result) =>
            result.status === "rejected" && result.reason?.response?.status !== 404
        );

        if (failedResult) {
          throw failedResult.reason;
        }
      }

      setServerSavedIds((prev) =>
        prev.filter((savedId) => savedId !== String(place.id))
      );

      setServerSavedFolderMap((prev) => {
        const next = { ...prev };
        delete next[String(place.id)];
        return next;
      });

      if (isSaved(place.id)) {
        toggleSavedPlace(place);
      }
    } catch (error) {
      console.error("관심 장소 연동 실패:", error);

      if (error.message.includes("Network Error")) {
        alert("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
        return;
      }

      alert(
        getErrorMessage(
          error,
          "관심 장소 연동에 실패했습니다. 잠시 후 다시 시도해주세요."
        )
      );
    } finally {
      setIsSavingId(null);
    }
  };

  const savePlaceToFolder = async (place, folder) => {
    try {
      setIsSavingId(place.id);

      const numericPlaceId = Number(place.id);

      const placePayload = {
        id: Number.isFinite(numericPlaceId) ? numericPlaceId : 0,
        name: place.title,
        latitude: place.latitude || 0,
        longitude: place.longitude || 0,
        address: place.address,
        placeType: place.placeType || place.tabType,
      };

      const placeResponse = await api.post(PLACES_API, placePayload);
      const registeredPlaceId = placeResponse.data?.id ?? place.id;

      await postPlaceToFolder(registeredPlaceId, folder);

      setServerSavedIds((prev) => {
        const nextIds = new Set(prev);
        nextIds.add(String(place.id));
        nextIds.add(String(registeredPlaceId));
        return [...nextIds];
      });

      setServerSavedFolderMap((prev) => ({
        ...prev,
        [String(place.id)]: getUniqueTextArray([
          ...(prev[String(place.id)] || []),
          folder.id,
        ]),
        [String(registeredPlaceId)]: getUniqueTextArray([
          ...(prev[String(registeredPlaceId)] || []),
          folder.id,
        ]),
      }));

      if (!isSaved(place.id) && !isSaved(registeredPlaceId)) {
        toggleSavedPlace({ ...place, id: registeredPlaceId, folder });
      }

      setIsFolderModalOpen(false);
      setFolderTargetPlace(null);
    } catch (error) {
      console.error("관심 장소 연동 실패:", error);

      if (error.message.includes("Network Error")) {
        alert("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
        return;
      }

      alert(
        getErrorMessage(
          error,
          "관심 장소 연동에 실패했습니다. 잠시 후 다시 시도해주세요."
        )
      );
    } finally {
      setIsSavingId(null);
    }
  };

  const handleSaveFolder = async (folder) => {
    if (!folderTargetPlace || isSavingId === folderTargetPlace.id) return;

    await savePlaceToFolder(folderTargetPlace, folder);
  };

  const handleToggleSaved = async (event, place, saved) => {
    event.stopPropagation();

    if (isSavingId === place.id) return;

    if (saved) {
      await removeSavedPlace(place);
      return;
    }

    setFolderTargetPlace(place);
    setIsFolderModalOpen(true);
  };

  return (
    <>
      <div className="recommend-page">
        <section className="recommend-hero">
          <h1 className="recommend-title">
            {isSearchMode ? (
              <>
                <span className="accent">"{searchKeyword}"</span> 검색 결과
                <br />
                관련 장소를 찾아드릴게요.
              </>
            ) : (
              <>
                어떤 여행을 꿈꾸시나요?
                <br />
                <span className="accent">취향에 딱 맞는 장소</span>를
                찾아드릴게요.
              </>
            )}
          </h1>
        </section>

        {!isSearchMode && (
          <section className="theme-grid">
            {themeCards.map((theme) => (
              <button
                key={theme.key}
                type="button"
                className={`theme-card ${
                  selectedTheme === theme.key ? "active" : ""
                }`}
                onClick={() => setSelectedTheme(theme.key)}
              >
                <div className="theme-icon-wrap">
                  <img
                    src={theme.icon}
                    alt=""
                    className={`theme-icon ${
                      theme.tone === "light" ? "theme-icon--light" : ""
                    }`}
                  />
                </div>
                <span className="theme-label">{theme.label}</span>
              </button>
            ))}
          </section>
        )}

        <section className="recommend-section">
          <div className="recommend-section-header">
            <h2>
              {isSearchMode
                ? `"${searchKeyword}" 관련 장소`
                : "당신만을 위한 추천 장소"}
            </h2>
            <button
              type="button"
              className="view-all-btn"
              onClick={handleViewAll}
            >
              전체보기
            </button>
          </div>

          {isLoading ? (
            <div className="recommend-card-list">
              <p>
                {isSearchMode
                  ? "검색 결과를 불러오는 중입니다."
                  : "추천 장소를 불러오는 중입니다."}
              </p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <p
                  style={{
                    margin: "0 0 14px",
                    fontSize: "13px",
                    color: "#ef4444",
                  }}
                >
                  {errorMessage}
                </p>
              )}

              {recommendedPlaces.length === 0 && !errorMessage ? (
                <div className="recommend-card-list">
                  <p
                    style={{
                      textAlign: "center",
                      color: "#94a3b8",
                      padding: "20px 0",
                    }}
                  >
                    {isSearchMode
                      ? `"${searchKeyword}" 관련 장소가 없습니다.`
                      : "해당 테마의 추천 장소가 아직 없습니다."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="recommend-card-list">
                    {paginatedPlaces.map((place) => {
                      const saved =
                        serverSavedIds.includes(String(place.id)) ||
                        isSaved(place.id);

                      return (
                        <article
                          key={place.id}
                          className="recommend-card"
                          onClick={() => handleDetailClick(place)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              handleDetailClick(place);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="recommend-card-image-wrap">
                            <img
                              src={place.image}
                              alt={place.title}
                              className="recommend-card-image"
                            />

                            <button
                              type="button"
                              className="recommend-heart-btn"
                              onClick={(e) =>
                                handleToggleSaved(e, place, saved)
                              }
                              disabled={isSavingId === place.id}
                              aria-label={saved ? "저장 취소" : "저장"}
                            >
                              <AnimatedHeart active={saved} />
                            </button>
                          </div>

                          <div className="recommend-card-body">
                            <div className="recommend-title-row">
                              <h3>{place.title}</h3>
                              <div className="recommend-rating">
                                <span className="star">★</span>
                                <span>{place.rating}</span>
                              </div>
                            </div>

                            <div className="recommend-address-row">
                              <PinIcon />
                              <span>{place.address}</span>
                            </div>

                            {place.description && (
                              <p className="recommend-description">
                                {place.description}
                              </p>
                            )}

                            <div className="recommend-tag-row">
                              {place.tags.map((tag) => (
                                <span key={tag} className="recommend-tag">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {recommendedPlaces.length > ITEMS_PER_PAGE && (
                    <div
                      className="recommend-pagination"
                      aria-label="추천 장소 페이지네이션"
                    >
                      <button
                        type="button"
                        className="recommend-page-btn recommend-page-nav"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        이전
                      </button>

                      {visiblePageNumbers.map((page) => (
                        <button
                          key={page}
                          type="button"
                          className={`recommend-page-btn ${
                            currentPage === page ? "active" : ""
                          }`}
                          onClick={() => handlePageChange(page)}
                          aria-current={
                            currentPage === page ? "page" : undefined
                          }
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        type="button"
                        className="recommend-page-btn recommend-page-nav"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        다음
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </div>

      <FolderSelectModal
        open={isFolderModalOpen}
        onClose={closeFolderModal}
        onSave={handleSaveFolder}
        isSaving={isSavingId === folderTargetPlace?.id}
      />
    </>
  );
}

export default Recommend;
