import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSavedPlaces } from "../Context/SavedPlacesContext";
import AnimatedHeart from "../AnimatedHeart/AnimatedHeart";
import FolderSelectModal from "../FolderSelectModal/FolderSelectModal";
import "./Total.css";
import api from "../api/api";

const RECOMMENDATIONS_API = "/api/recommendations";
const FOLDERS_API = "/api/folders";
const PLACES_API = "/api/places";

const getPlaceArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.places)) return data.places;
  if (Array.isArray(data?.recommendations)) return data.recommendations;
  if (Array.isArray(data?.data?.places)) return data.data.places;
  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.recommendations)) {
    return data.data.recommendations;
  }

  return [];
};

const getIntroText = (data) => {
  return (
    data?.intro ||
    data?.message ||
    data?.description ||
    data?.data?.intro ||
    data?.data?.message ||
    data?.data?.description ||
    ""
  );
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

const normalizePlace = (place) => {
  const id = place.id || place.placeId || place.destinationId;
  const placeType =
    place.placeType ||
    place.category ||
    place.categoryName ||
    place.type ||
    "명소";

  return {
    id,
    title:
      place.title ||
      place.name ||
      place.placeName ||
      place.destinationName ||
      "장소 이름 없음",
    description: place.description || place.intro || place.summary || "",
    address:
      place.address ||
      place.roadAddress ||
      place.location ||
      place.addr ||
      "주소 정보 없음",
    latitude: Number(place.latitude ?? 0),
    longitude: Number(place.longitude ?? 0),
    placeType,
    theme: place.theme || place.themeName || "",
    rating: Number(place.rating || place.score || place.avgRating) || 0,
    distance: Number(
      place.distance || place.distanceKm || place.km || place.range || 0
    ),
    image:
      place.image ||
      place.imageUrl ||
      place.thumbnail ||
      place.thumbnailUrl ||
      place.photoUrl ||
      "",
    tags: normalizeTags(place.tags || place.hashtags),
    originalData: place,
  };
};

const getFolderArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.folders)) return data.folders;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data?.folders)) return data.data.folders;
  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.data?.items)) return data.data.items;

  return [];
};

const getFolderId = (folder) => {
  return folder?.id ?? folder?.folderId ?? folder?.folder_id ?? null;
};

const getSavedPlaceId = (savedPlace) => {
  const placeData = savedPlace?.place || savedPlace?.destination || savedPlace;

  return (
    placeData?.placeId ??
    placeData?.id ??
    savedPlace?.placeId ??
    savedPlace?.destinationId ??
    savedPlace?.id ??
    null
  );
};

const getFolderPlacesUrl = (folderId) => {
  return `${FOLDERS_API}/${encodeURIComponent(folderId)}/places`;
};

const getFolderPlaceDeleteUrl = (folderId, placeId) => {
  return `${FOLDERS_API}/${encodeURIComponent(
    folderId
  )}/places/${encodeURIComponent(placeId)}`;
};

const getResponseData = (data) => {
  if (data?.data) return data.data;
  if (data?.place) return data.place;
  if (data?.result) return data.result;
  return data;
};

const registerPlace = async (place) => {
  const numericPlaceId = Number(place.id);
  const placePayload = {
    id: Number.isFinite(numericPlaceId) ? numericPlaceId : 0,
    name: place.title,
    latitude: place.latitude || 0,
    longitude: place.longitude || 0,
    address: place.address,
    placeType: place.placeType,
  };

  try {
    const response = await api.post(PLACES_API, placePayload);
    const responseData = getResponseData(response.data);

    return responseData?.id ?? responseData?.placeId ?? place.id;
  } catch (error) {
    if ([400, 409, 422].includes(error.response?.status)) {
      return place.id;
    }

    throw error;
  }
};

const getErrorMessage = (error, fallbackMessage) => {
  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  return data?.message || data?.error || fallbackMessage;
};

function Total() {
  const navigate = useNavigate();
  const { isSaved, toggleSavedPlace } = useSavedPlaces();
  const [searchParams] = useSearchParams();

  const [sortBy, setSortBy] = useState("인기순");
  const [places, setPlaces] = useState([]);
  const [serverSavedIds, setServerSavedIds] = useState([]);
  const [serverSavedFolderMap, setServerSavedFolderMap] = useState({});
  const [introText, setIntroText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingId, setIsSavingId] = useState(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderTargetPlace, setFolderTargetPlace] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedTheme = searchParams.get("theme") || "힐링";

  useEffect(() => {
    const fetchTotalPlaces = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await api.get(RECOMMENDATIONS_API, {
          params: {
            theme: selectedTheme,
          },
        });

        const nextPlaces = getPlaceArray(response.data)
          .map(normalizePlace)
          .filter((place) => place.id !== undefined && place.id !== null);

        setPlaces(nextPlaces);
        setIntroText(getIntroText(response.data));
      } catch (error) {
        console.error("전체 추천 장소 조회 실패:", error);
        setPlaces([]);
        setIntroText("");

        if (error.message.includes("Network Error")) {
          setErrorMessage("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
          return;
        }

        if (error.response?.status === 401 || error.response?.status === 403) {
          setErrorMessage("로그인 정보가 만료되었거나 권한이 없습니다.");
          return;
        }

        setErrorMessage(
          getErrorMessage(
            error,
            "추천 장소를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
          )
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchTotalPlaces();
  }, [selectedTheme]);

  useEffect(() => {
    const fetchSavedPlaces = async () => {
      try {
        const folderResponse = await api.get(FOLDERS_API);
        const folderList = getFolderArray(folderResponse.data).filter(
          (folder) => getFolderId(folder) !== null && getFolderId(folder) !== undefined
        );

        const placeResponses = await Promise.allSettled(
          folderList.map((folder) => api.get(getFolderPlacesUrl(getFolderId(folder))))
        );

        const savedIds = new Set();
        const savedFolderMap = {};

        placeResponses.forEach((result, index) => {
          if (result.status !== "fulfilled") return;

          const folderId = getFolderId(folderList[index]);
          const savedPlaces = getPlaceArray(result.value.data);

          savedPlaces.forEach((savedPlace) => {
            const placeId = getSavedPlaceId(savedPlace);

            if (placeId === null || placeId === undefined) return;

            const placeIdText = String(placeId);
            savedIds.add(placeIdText);
            savedFolderMap[placeIdText] = {
              folderId: String(folderId),
              placeId: placeIdText,
            };
          });
        });

        setServerSavedIds([...savedIds]);
        setServerSavedFolderMap(savedFolderMap);
      } catch (error) {
        console.error("저장 장소 상태 조회 실패:", error);
        setServerSavedIds([]);
        setServerSavedFolderMap({});
      }
    };

    fetchSavedPlaces();
  }, []);

  const sortedPlaces = useMemo(() => {
    const copied = [...places];

    if (sortBy === "거리순") {
      return copied.sort((a, b) => a.distance - b.distance);
    }

    if (sortBy === "별점순") {
      return copied.sort((a, b) => b.rating - a.rating);
    }

    return copied;
  }, [places, sortBy]);

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

  const postFolderPlace = async (folder, placeId) => {
    return api.post(getFolderPlacesUrl(folder.id), {
      placeId,
    });
  };

  const showSaveError = (error) => {
    console.error("관심 장소 변경 실패:", error);

    if (error.message.includes("Network Error")) {
      alert("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
      return;
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      alert("로그인 정보가 만료되었거나 권한이 없습니다.");
      return;
    }

    alert(
      getErrorMessage(
        error,
        "관심 장소 변경에 실패했습니다. 잠시 후 다시 시도해주세요."
      )
    );
  };

  const removeSavedPlace = async (place) => {
    try {
      setIsSavingId(place.id);

      const savedInfo = serverSavedFolderMap[String(place.id)];

      if (savedInfo?.folderId) {
        await api.delete(
          getFolderPlaceDeleteUrl(
            savedInfo.folderId,
            savedInfo.placeId || place.id
          )
        );
      }

      setServerSavedIds((prev) =>
        prev.filter(
          (savedId) =>
            savedId !== String(place.id) &&
            savedId !== String(savedInfo?.placeId || "")
        )
      );

      setServerSavedFolderMap((prev) => {
        const next = { ...prev };
        delete next[String(place.id)];

        if (savedInfo?.placeId) {
          delete next[String(savedInfo.placeId)];
        }

        return next;
      });

      if (isSaved(place.id)) {
        toggleSavedPlace(place);
      }
    } catch (error) {
      showSaveError(error);
    } finally {
      setIsSavingId(null);
    }
  };

  const savePlaceToFolder = async (place, folder) => {
    try {
      setIsSavingId(place.id);

      const registeredPlaceId = await registerPlace(place);

      await postFolderPlace(folder, registeredPlaceId);

      const savedInfo = {
        folderId: String(folder.id),
        placeId: String(registeredPlaceId),
      };

      setServerSavedIds((prev) => {
        const nextIds = new Set(prev);
        nextIds.add(String(place.id));
        nextIds.add(String(registeredPlaceId));
        return [...nextIds];
      });

      setServerSavedFolderMap((prev) => ({
        ...prev,
        [String(place.id)]: savedInfo,
        [String(registeredPlaceId)]: savedInfo,
      }));

      if (!isSaved(place.id)) {
        toggleSavedPlace({ ...place, folder });
      }

      setIsFolderModalOpen(false);
      setFolderTargetPlace(null);
    } catch (error) {
      showSaveError(error);
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

    if (!place.id || isSavingId === place.id) return;

    if (saved) {
      await removeSavedPlace(place);
      return;
    }

    setFolderTargetPlace(place);
    setIsFolderModalOpen(true);
  };

  const pageTitle = introText || `${selectedTheme} 추천 장소`;

  return (
    <>
      <div className="total-page">
      <section className="total-intro">
        <h1>{isLoading ? "추천 장소를 불러오는 중입니다." : pageTitle}</h1>
      </section>

      <div className="sort-chip-row">
        <button
          type="button"
          className={`sort-chip ${sortBy === "인기순" ? "active" : ""}`}
          onClick={() => setSortBy("인기순")}
        >
          인기순
          <span>⌄</span>
        </button>

        <button
          type="button"
          className={`sort-chip ${sortBy === "거리순" ? "active" : ""}`}
          onClick={() => setSortBy("거리순")}
        >
          거리순
          <span>⌄</span>
        </button>

        <button
          type="button"
          className={`sort-chip ${sortBy === "별점순" ? "active" : ""}`}
          onClick={() => setSortBy("별점순")}
        >
          별점순
          <span>⌄</span>
        </button>
      </div>

      {errorMessage && (
        <p
          style={{
            margin: "0 20px 14px",
            fontSize: "13px",
            color: "#ef4444",
          }}
        >
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && sortedPlaces.length === 0 && (
        <p
          style={{
            margin: "0 20px 14px",
            fontSize: "13px",
            color: "#6b7280",
          }}
        >
          추천 장소가 없습니다.
        </p>
      )}

      <section className="theme-total-list">
        {sortedPlaces.map((place) => {
          const saved =
            serverSavedIds.includes(String(place.id)) || isSaved(place.id);

          return (
            <article key={place.id} className="theme-total-card">
              <div className="theme-total-image-wrap">
                {place.image ? (
                  <img
                    src={place.image}
                    alt={place.title}
                    className="theme-total-image"
                  />
                ) : (
                  <div
                    className="theme-total-image"
                    aria-label={`${place.title} 이미지 없음`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#e5f4ff",
                      color: "#6b7280",
                      fontSize: "13px",
                    }}
                  >
                    이미지 없음
                  </div>
                )}

                <button
                  type="button"
                  className="theme-total-save-btn"
                  onClick={(event) => handleToggleSaved(event, place, saved)}
                  disabled={isSavingId === place.id}
                  aria-label={saved ? "저장 취소" : "저장"}
                >
                  <AnimatedHeart active={saved} />
                </button>
              </div>

              <div className="theme-total-body">
                <div className="theme-total-title-row">
                  <h3>{place.title}</h3>
                  <div className="theme-total-rating">
                    <span>★</span>
                    <span>{place.rating}</span>
                  </div>
                </div>

                <p className="theme-total-address">{place.address}</p>

                {place.tags.length > 0 && (
                  <div className="theme-total-tag-row">
                    {place.tags.map((tag) => (
                      <span key={tag} className="theme-total-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="theme-total-detail-btn"
                  onClick={() => handleDetailClick(place)}
                >
                  상세보기
                </button>
              </div>
            </article>
          );
        })}
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

export default Total;
