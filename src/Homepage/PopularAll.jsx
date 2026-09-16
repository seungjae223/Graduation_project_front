import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AnimatedHeart from "../AnimatedHeart/AnimatedHeart";
import FolderSelectModal from "../FolderSelectModal/FolderSelectModal";
import api from "../api/api";
import "./PopularAll.css";

import tokyoImg from "../img/도쿄.png";
import kyotoImg from "../img/교토.png";
import beachImg from "../img/서비스 소개 .png";

const FOLDERS_API = "/api/folders";
const PLACES_API = "/api/places";

const filterList = ["전체", "일본", "한국", "동남아"];

const getArrayData = (data) => {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.places)) return data.places;
  if (Array.isArray(data?.folders)) return data.folders;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.results)) return data.results;

  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.places)) return data.data.places;
  if (Array.isArray(data?.data?.folders)) return data.data.folders;

  return [];
};

const getNumberValue = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;

    const numberValue = Number(value);

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return null;
};

const getIdValue = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;

    const textValue = String(value).trim();

    if (/^\d+$/.test(textValue)) {
      return textValue;
    }
  }

  return null;
};

const normalizeFolder = (folder = {}) => {
  const folderId = getIdValue(folder.id, folder.folderId);

  if (!folderId) {
    return null;
  }

  return {
    ...folder,
    id: folderId,
    name: folder.name || folder.folderName || "이름 없는 폴더",
  };
};

const fetchFolders = async () => {
  const response = await api.get(FOLDERS_API);

  return getArrayData(response.data).map(normalizeFolder).filter(Boolean);
};

const fetchFolderPlaces = async (folderId) => {
  const response = await api.get(`${FOLDERS_API}/${folderId}/places`);

  return getArrayData(response.data);
};

const getPlaceText = (place = {}) =>
  [
    place.region,
    place.name,
    place.placeName,
    place.title,
    place.theme,
    place.description,
    place.address,
    place.placeType,
  ]
    .filter(Boolean)
    .join(" ");

const getPlaceImage = (place = {}) => {
  const text = getPlaceText(place);

  if (/교토|kyoto/i.test(text)) {
    return kyotoImg;
  }

  if (
    /제주|부산|광안리|해운대|바다|해변|오션|발리|다낭|베트남|인도네시아|beach|bali|danang/i.test(
      text
    )
  ) {
    return beachImg;
  }

  return tokyoImg;
};

const getPlaceTags = (place = {}) => {
  if (Array.isArray(place.tags) && place.tags.length > 0) {
    return place.tags;
  }

  const tags = [place.theme, place.placeType, place.region]
    .filter(Boolean)
    .flatMap((value) =>
      String(value)
        .split(/[,\s/|]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    );

  return [...new Set(tags)].slice(0, 3).map((tag) => {
    if (tag.startsWith("#")) return tag;
    return `#${tag}`;
  });
};

const normalizePlace = (place = {}, index = 0) => {
  const name =
    place.name ||
    place.placeName ||
    place.title ||
    place.destinationName ||
    "이름 없는 장소";

  const placeId =
    getIdValue(place.id, place.placeId, place.destinationId) ||
    place.id ||
    place.placeId ||
    `place-${index}`;

  const latitude = getNumberValue(place.latitude, place.lat, place.y);
  const longitude = getNumberValue(
    place.longitude,
    place.lng,
    place.lon,
    place.x
  );

  return {
    ...place,
    id: placeId,
    region: place.region || "",
    name,
    placeName: name,
    title: name,
    image: place.image || place.imageUrl || getPlaceImage({ ...place, name }),
    tags: getPlaceTags(place),
    address: place.address || "",
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    theme: place.theme || "",
    description: place.description || "",
    placeType: place.placeType || "",
  };
};

const regionMatchers = {
  일본:
    /일본|도쿄|교토|오사카|나라|후쿠오카|삿포로|요코하마|나고야|오키나와|japan|jp|jpn|tokyo|kyoto|osaka|nara|fukuoka|sapporo|yokohama|nagoya|okinawa/i,
  한국:
    /한국|대한민국|국내|서울|제주|부산|강원|경주|여수|거제|인천|대구|대전|광주|울산|전주|속초|강릉|남해|안동|양양|korea|kr|kor|seoul|jeju|busan|gangwon|gyeongju|yeosu|geoje/i,
  동남아:
    /동남아|베트남|태국|인도네시아|필리핀|싱가포르|말레이시아|라오스|캄보디아|발리|다낭|방콕|하노이|호치민|세부|vietnam|thailand|indonesia|philippines|singapore|malaysia|bali|danang|bangkok|hanoi|cebu/i,
};

const isMatchedFilter = (place, selectedFilter) => {
  if (selectedFilter === "전체") {
    return true;
  }

  const text = getPlaceText(place);
  const matcher = regionMatchers[selectedFilter];

  if (!matcher) {
    return text.includes(selectedFilter);
  }

  return matcher.test(text);
};

const getErrorMessage = (error, fallbackMessage) => {
  const data = error?.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  return data?.message || data?.error || error?.message || fallbackMessage;
};

function PopularAll() {
  const navigate = useNavigate();

  const [selectedFilter, setSelectedFilter] = useState("전체");
  const [places, setPlaces] = useState([]);
  const [serverSavedIds, setServerSavedIds] = useState([]);
  const [savedFolderMap, setSavedFolderMap] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSavingId, setIsSavingId] = useState(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderTargetPlace, setFolderTargetPlace] = useState(null);

  const fetchFolderSavedPlaces = async () => {
    try {
      const folders = await fetchFolders();

      const placeIdSet = new Set();
      const nextFolderMap = {};

      await Promise.all(
        folders.map(async (folder) => {
          try {
            const folderPlaces = await fetchFolderPlaces(folder.id);

            folderPlaces.forEach((place) => {
              const placeId = getIdValue(place.id, place.placeId);

              if (!placeId) return;

              placeIdSet.add(placeId);
              nextFolderMap[placeId] = folder;
            });
          } catch (error) {
            console.error(`폴더 장소 조회 실패: ${folder.id}`, error);
          }
        })
      );

      setServerSavedIds([...placeIdSet]);
      setSavedFolderMap(nextFolderMap);
    } catch (error) {
      console.error("폴더 저장 장소 상태 조회 실패:", error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchPlacesData = async () => {
      try {
        const response = await api.get(PLACES_API);
        const data = getArrayData(response.data);

        if (!mounted) return;

        setPlaces(data.map((place, index) => normalizePlace(place, index)));
      } catch (error) {
        console.error("장소 목록 조회 실패:", error);

        if (!mounted) return;

        setPlaces([]);
      } finally {
        if (mounted) {
          setIsLoaded(true);
        }
      }
    };

    fetchPlacesData();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSavedPlaces = async () => {
      if (!mounted) return;
      await fetchFolderSavedPlaces();
    };

    loadSavedPlaces();

    return () => {
      mounted = false;
    };
  }, []);

  const visiblePlaces = useMemo(() => {
    if (!isLoaded) {
      return [];
    }

    return places;
  }, [places, isLoaded]);

  const filteredPlaces = useMemo(() => {
    return visiblePlaces.filter((place) =>
      isMatchedFilter(place, selectedFilter)
    );
  }, [visiblePlaces, selectedFilter]);

  const hotPlaces = useMemo(() => {
    return filteredPlaces.slice(0, 4);
  }, [filteredPlaces]);

  const monthlyPlaces = useMemo(() => {
    return filteredPlaces.slice(4, 8);
  }, [filteredPlaces]);

  const handleCardClick = (place) => {
    navigate(`/detail?id=${encodeURIComponent(place.id)}`, {
      state: { place },
    });
  };

  const closeFolderModal = () => {
    if (isSavingId) return;

    setIsFolderModalOpen(false);
    setFolderTargetPlace(null);
  };

  const removeSavedPlace = async (place) => {
    const placeId = getIdValue(place.id, place.placeId);

    if (!placeId) {
      alert("장소 ID가 올바르지 않아 삭제할 수 없습니다.");
      return;
    }

    try {
      setIsSavingId(placeId);

      const savedFolder = savedFolderMap[placeId];
      const folderId = getIdValue(savedFolder?.id, savedFolder?.folderId);

      if (!folderId) {
        alert("이 장소가 저장된 폴더 정보를 찾지 못했어요.");
        await fetchFolderSavedPlaces();
        return;
      }

      await api.delete(`${FOLDERS_API}/${folderId}/places/${placeId}`);

      setServerSavedIds((prev) =>
        prev.filter((savedId) => savedId !== placeId)
      );

      setSavedFolderMap((prev) => {
        const nextMap = { ...prev };
        delete nextMap[placeId];
        return nextMap;
      });
    } catch (error) {
      console.error("폴더에서 장소 삭제 실패:", error);

      if (error.message.includes("Network Error")) {
        alert("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
        return;
      }

      if (error.response?.status === 403) {
        alert("폴더에서 장소를 삭제할 권한이 없습니다. 로그인 상태를 확인해주세요.");
        return;
      }

      alert(
        getErrorMessage(
          error,
          "폴더에서 장소를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요."
        )
      );
    } finally {
      setIsSavingId(null);
    }
  };

  const savePlaceToFolder = async (place, folder) => {
    const placeId = getIdValue(place.id, place.placeId);
    const folderId = getIdValue(folder?.id, folder?.folderId);

    if (!placeId) {
      alert("장소 ID가 올바르지 않아 저장할 수 없습니다.");
      return;
    }

    if (!folderId) {
      alert("폴더 ID가 올바르지 않습니다. 폴더 목록은 서버에서 받아와야 합니다.");
      return;
    }

    try {
      setIsSavingId(placeId);

      await api.post(`${FOLDERS_API}/${folderId}/places/${placeId}`);

      const savedFolder = {
        ...folder,
        id: folderId,
      };

      setServerSavedIds((prev) => {
        const nextIds = new Set(prev);
        nextIds.add(placeId);
        return [...nextIds];
      });

      setSavedFolderMap((prev) => ({
        ...prev,
        [placeId]: savedFolder,
      }));

      setIsFolderModalOpen(false);
      setFolderTargetPlace(null);
    } catch (error) {
      console.error("폴더에 장소 저장 실패:", error);

      if (error.message.includes("Network Error")) {
        alert("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
        return;
      }

      if (error.response?.status === 403) {
        alert(
          "폴더에 장소를 저장할 권한이 없습니다. 로그인 상태 또는 폴더 권한을 확인해주세요."
        );
        return;
      }

      alert(
        getErrorMessage(
          error,
          "폴더에 장소를 저장하지 못했습니다. 잠시 후 다시 시도해주세요."
        )
      );
    } finally {
      setIsSavingId(null);
    }
  };

  const handleSaveFolder = async (folder) => {
    const targetPlaceId = getIdValue(folderTargetPlace?.id);

    if (!folderTargetPlace || isSavingId === targetPlaceId) return;

    await savePlaceToFolder(folderTargetPlace, folder);
  };

  const handleToggleSaved = async (event, place, saved) => {
    event.stopPropagation();

    const placeId = getIdValue(place.id, place.placeId);

    if (!placeId) {
      alert("장소 ID가 올바르지 않습니다.");
      return;
    }

    if (isSavingId === placeId) return;

    if (saved) {
      await removeSavedPlace(place);
      return;
    }

    setFolderTargetPlace(place);
    setIsFolderModalOpen(true);
  };

  return (
    <>
      <div className="popular-all-page">
        <div className="popular-filter-row">
          {filterList.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`popular-filter-btn ${
                selectedFilter === filter ? "active" : ""
              }`}
              onClick={() => setSelectedFilter(filter)}
            >
              {filter}
              {filter !== "전체" && <span>⌄</span>}
            </button>
          ))}
        </div>

        <section className="popular-grid popular-grid-one-column">
          {hotPlaces.map((place) => {
            const placeId = getIdValue(place.id, place.placeId);
            const saved = placeId ? serverSavedIds.includes(placeId) : false;

            return (
              <article
                key={place.id}
                className="popular-grid-card"
                onClick={() => handleCardClick(place)}
              >
                <img
                  src={place.image}
                  alt={place.title}
                  className="popular-grid-image"
                />

                <button
                  type="button"
                  className="popular-like-btn"
                  onClick={(e) => handleToggleSaved(e, place, saved)}
                  disabled={placeId ? isSavingId === placeId : false}
                  aria-label={saved ? "저장 취소" : "저장"}
                >
                  <AnimatedHeart active={saved} />
                </button>

                <div className="popular-grid-overlay" />

                <div className="popular-grid-text">
                  <h3>{place.title}</h3>
                </div>
              </article>
            );
          })}
        </section>

        {monthlyPlaces.length > 0 && (
          <section className="popular-month-section">
            <h2>이달의 추천지</h2>

            <div className="popular-month-list">
              {monthlyPlaces.map((place) => {
                const placeId = getIdValue(place.id, place.placeId);
                const saved = placeId ? serverSavedIds.includes(placeId) : false;

                return (
                  <article
                    key={place.id}
                    className="popular-month-card"
                    onClick={() => handleCardClick(place)}
                  >
                    <img
                      src={place.image}
                      alt={place.title}
                      className="popular-month-thumb"
                    />

                    <div className="popular-month-body">
                      <div className="popular-month-top">
                        <h3>{place.title}</h3>

                        <button
                          type="button"
                          className="popular-bookmark-btn popular-heart-btn"
                          onClick={(e) => handleToggleSaved(e, place, saved)}
                          disabled={placeId ? isSavingId === placeId : false}
                          aria-label={saved ? "저장 취소" : "저장"}
                        >
                          <AnimatedHeart active={saved} />
                        </button>
                      </div>

                      {place.tags.length > 0 && (
                        <div className="popular-month-tags">
                          {place.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <FolderSelectModal
        open={isFolderModalOpen}
        onClose={closeFolderModal}
        onSave={handleSaveFolder}
        isSaving={
          folderTargetPlace
            ? isSavingId === getIdValue(folderTargetPlace.id)
            : false
        }
      />
    </>
  );
}

export default PopularAll;