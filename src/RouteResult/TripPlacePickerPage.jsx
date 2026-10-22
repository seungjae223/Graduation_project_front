import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { getTripByIdApi, getTripPlacesApi, addPlaceToTripApi } from "../api/tripApi";
import { getDestinationsApi, getDestinationPlacesApi } from "../api/destinationApi";
import { getFoldersApi, getFolderPlacesApi } from "../api/placeApi";
import { getPlaceEngagementApi } from "../api/placeEngagementApi";
import { getAuthSnapshot } from "../utils/authState";
import useSessionKey from "../utils/useSessionKey";
import { uncertainMutation } from "../utils/useMutationTask";
import { getPlacePhoto } from "../data/placePhotos";
import PlacePhoto from "../components/PlacePhoto";
import { tripDays } from "./tripDetailModel";
import { readOptimizedVersions, saveOptimizedDays } from "./tripOptimizationVersionStore";
import { addOptimizedPlace } from "./optimizedVisitDraft";
import { PLACE_CATEGORIES, placeIdOf, destinationForTrip, normalizeFolderPlace,
  classifySources, belongsToDestination, filterPlaceList, togglePlaceSelection,
  pickerReturnPath } from "./tripPlacePickerModel";
import "./TripPlacePickerPage.css";

function useStableKey(tripId, account, optimizedMode = false) {
  return useMemo(() => {
    if (!/^\d+$/.test(String(tripId || "")) || !account || account === "anonymous") return null;
    // Account-specific browser session draft, never a shared localStorage catalog.
    return "nomango:place-picker:v4:" + tripId + ":" + encodeURIComponent(account) +
      (optimizedMode ? ":optimized" : "");
  }, [tripId, account, optimizedMode]);
}
function readDraft(key) {
  if (!key || typeof sessionStorage === "undefined") return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) || "null");
    return parsed && parsed.version === 4 && Array.isArray(parsed.selection) ? parsed : null;
  } catch { return null; }
}
function writeDraft(key, draft) {
  if (!key || typeof sessionStorage === "undefined") return;
  try { sessionStorage.setItem(key, JSON.stringify({ version: 4, ...draft })); }
  catch { /* The current mounted selection still works without session persistence. */ }
}
function SearchIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor"
    fill="none" strokeWidth="1.8"><circle cx="10.7" cy="10.7" r="7"/><path d="m16 16 5 5"/></svg>;
}
function PlaceItem({ place, engagement, selected, already, onToggle, onDetail }) {
  const count = engagement?.likeCount;
  const reviews = engagement?.reviewCount;
  const ratingLabel = reviews === 0 ? "0.0" :
    Number.isFinite(engagement?.averageRating) ? engagement.averageRating.toFixed(1) : "—";
  return <li className="v166-place-row">
    <span className="v166-place-image">
      <PlacePhoto place={place} src={place.imageUrl || place.thumbnailUrl ||
        getPlacePhoto(place.name).image} alt={place.name}/>
      <button type="button" className="v166-photo-detail" aria-label={place.name + " 사진으로 상세 보기"}
        onClick={() => onDetail(place)}/>
    </span>
    <button type="button" className="v166-place-detail" aria-label={place.name + " 상세 보기"}
      onClick={() => onDetail(place)}>
      <span className="v166-place-body"><strong>{place.name}</strong>
        <span className="v166-place-counts">
          {Number.isSafeInteger(count) && <span className="v166-like-count" aria-label={"좋아요 " + count + "개"}>♥ {count.toLocaleString("ko-KR")}</span>}
          {Number.isSafeInteger(reviews) && <span className="v166-rating-count"
            aria-label={"평점 " + ratingLabel + ", 리뷰 " + reviews + "개"}>
            ★ {ratingLabel}({reviews.toLocaleString("ko-KR")})
          </span>}
        </span>
      </span>
    </button>
    <button type="button" className={"v166-pick-action" + (!selected && already ? " is-already" : "")}
      title={!selected && already ? "이 일차에 이미 등록된 장소예요. 중복은 선택 완료 때 확인해요." : undefined}
      aria-pressed={selected}
      aria-label={place.name + (selected ? " 선택 해제" : " 선택")}
      onClick={() => onToggle(place.id)}>
      <span className="v166-pick-symbol" aria-hidden="true">
        <span className="v166-pick-plus">+</span>
        <svg className="v166-pick-check" viewBox="0 0 24 24" width="21" height="21"
          fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"
          strokeLinejoin="round"><path d="m4 12 5 5L20 6"/></svg>

      </span>
    </button>
  </li>;
}
export default function TripPlacePickerPage() {
  const [params] = useSearchParams();
  const tripId = params.get("id");
  const initialDay = Number(params.get("day")) || 1;
  const optimizedMode = params.get("version") === "optimized";
  const originSuffix = params.get("origin") === "past" ? "&origin=past" : "";
  const navigate = useNavigate();
  const account = useSessionKey();
  const storageKey = useStableKey(tripId, account, optimizedMode);
  const [restoreKey, setRestoreKey] = useState(null);
  const [trip, setTrip] = useState(null);
  const [tripPlaces, setTripPlaces] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [destination, setDestination] = useState(null);
  const [sources, setSources] = useState([]);
  const [status, setStatus] = useState("loading");
  const [engagement, setEngagement] = useState({});
  const [engagementError, setEngagementError] = useState(false);
  const [error, setError] = useState("");
  const [day, setDay] = useState(initialDay);
  const [selectedDays, setSelectedDays] = useState([initialDay]);
  const [source, setSource] = useState("all");
  const [category, setCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState([]);
  const [duplicateConfirm, setDuplicateConfirm] = useState(null);
  const [returnNotice, setReturnNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const busy = useRef(false);
  const owner = useRef({ account, tripId });
  owner.current = { account, tripId };
  const alive = () => getAuthSnapshot().accountKey === account &&
    owner.current.account === account && String(owner.current.tripId) === String(tripId);
  const days = useMemo(() => tripDays(trip, tripPlaces, {}), [trip, tripPlaces]);
  const actualDay = days.length ? (days.some(d => d.day === day) ? day : days[0].day) : day;
  const known = useMemo(() => new Map(catalog.map(place => [placeIdOf(place), place])), [catalog]);
  // Every folder is read to rank its matching destination records, rather than
  // pretending the optional folder-wide count is the region count.
  const currentSource = sources.find(item => item.id === source);
  const regional = query.trim() || source === "all" ? catalog : (currentSource?.places || []);
  const visible = useMemo(() => filterPlaceList(regional, category, query), [regional, category, query]);

  const selectedIds = selection.filter(id =>
    (catalog.some(p => p.id === id) || sources.some(item => item.places.some(p => p.id === id))));
  const validDays = selectedDays.filter(dayNumber => days.some(d => d.day === dayNumber));
  const appliedDays = validDays;
  const optimizedVersions = optimizedMode ? readOptimizedVersions(tripId, account, tripPlaces) : {};
  const optimizedIdsByDay = Object.fromEntries(Object.entries(optimizedVersions).map(([dayNumber, draft]) => [
    dayNumber, new Set(draft.order.map(key => Number(
      draft.sourcePlaces?.[String(key)]?.placeId ??
      tripPlaces.find(visit => String(visit.tripPlaceId ?? visit.id) === String(key))?.placeId ??
      draft.addedPlaces?.[String(key)]?.placeId)).filter(Number.isSafeInteger)),
  ]));
  const returnToEditor = () => "/route-result?id=" + encodeURIComponent(tripId) +
    "&edit=1&day=" + encodeURIComponent(appliedDays[0] || initialDay) +
    (optimizedMode ? "&version=optimized" : "") + originSuffix;
  const duplicatesFor = visits => appliedDays.flatMap(dayNumber =>
    selectedIds.filter(id => visits.some(p => Number(p.day) === dayNumber && Number(p.placeId) === id))
      .map(id => ({ day: dayNumber, id, name: allKnown.get(id)?.name || "장소 " + id })));

  const allKnown = useMemo(() => {
    const values = new Map(catalog.map(p => [placeIdOf(p), p]));
    sources.forEach(item => item.places.forEach(p => values.set(placeIdOf(p), p)));
    return values;
  }, [catalog, sources]);
  useEffect(() => {
    const initial = readDraft(storageKey);
    setDay(initialDay);
    // Reopening the picker resets only the target days, not its saved basket/filters.
    setSelectedDays([initialDay]);
    setSource(initial?.source || "all");
    setCategory(initial?.category || "ALL");
    setQuery(initial?.query || "");
    setSelection(initial?.selection || []);
    setRestoreKey(storageKey);
  }, [storageKey, initialDay]);
  useEffect(() => {
    if (restoreKey !== storageKey) return;
    writeDraft(storageKey, { day: actualDay, selectedDays, source, category, query, selection });
  }, [storageKey, restoreKey, actualDay, selectedDays, source, category, query, selection]);

  const load = async () => {
    if (!alive()) return;
    setStatus("loading");setError("");
    try {
      const [tripValue, tripVisits, destinationRows, folders] = await Promise.all([
        getTripByIdApi(tripId), getTripPlacesApi(tripId), getDestinationsApi(), getFoldersApi(),
      ]);
      if (!alive()) return;
      const matched = destinationForTrip(destinationRows, tripValue.destination);
      if (!matched) throw new Error("이 여행의 지역 목록을 찾지 못했어요. 여행지를 확인해 주세요.");
      const [regionRows, ...folderContents] = await Promise.all([
        getDestinationPlacesApi(matched.code),
        ...folders.map(folder => getFolderPlacesApi(folder.id)),
      ]);
      if (!alive()) return;
      const places = regionRows.map(normalizeFolderPlace).filter(Boolean);
      const regionIds = new Set(places.map(p => p.id));
      const byFolder = Object.fromEntries(folders.map((f, i) => [String(f.id), folderContents[i]]));
      const tripStays = tripVisits.map(visit =>
        places.find(place => place.id === Number(visit.placeId))).filter(Boolean);
      const scoped = classifySources(folders, byFolder, matched, regionIds, tripStays);
      const regionalCatalog = places.filter(p => belongsToDestination(p, matched, regionIds));
      setTrip(tripValue);
      setTripPlaces(tripVisits);
      setDestination(matched);
      setCatalog(regionalCatalog);
      setSources(scoped);
      setSource(prev => prev === "all" || scoped.some(s => s.id === prev) ? prev : "all");
      setStatus("success");
    } catch (e) {
      if (alive()) {setError(e?.message || "장소 목록을 불러오지 못했어요.");setStatus("error");}
    }
  };
  useEffect(() => {
    if (!storageKey) return;
    void load();
    // New authenticated trip/account loads own records; no cross-account fallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (status !== "success" || !visible.length) { setEngagement({});setEngagementError(false);return; }
    let cancelled = false;
    // Only visible IDs; engagement API batches requests at 100 per batch.
    const ids = [...new Set(visible.map(p => p.id))];
    setEngagementError(false);
    getPlaceEngagementApi(ids).then(rows => {
      if (!cancelled && alive()) setEngagement(Object.fromEntries(rows.map(r => [r.placeId, r])));
    }).catch(() => { if (!cancelled && alive()) {setEngagement({});setEngagementError(true);} });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, visible.map(p => p.id).join(","), account, tripId]);

  useEffect(() => {
    if (!returnNotice) return;
    const timeout = setTimeout(() => setReturnNotice(false), 2000);
    const dismiss = () => setReturnNotice(false);
    const dismissOutside = event => {
      if (!event.target?.closest?.(".v166-cart-dock")) setReturnNotice(false);
    };
    window.addEventListener("pointerdown", dismissOutside);
    window.addEventListener("scroll", dismiss, { passive: true, capture: true });
    window.addEventListener("wheel", dismiss, { passive: true });
    window.addEventListener("touchmove", dismiss, { passive: true });
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("pointerdown", dismissOutside);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("wheel", dismiss);
      window.removeEventListener("touchmove", dismiss);
    };
  }, [returnNotice]);
  const chooseDay = chosen => {
    if (saving || blocked) return;
    setReturnNotice(false);
    const next = selectedDays.includes(chosen)
      ? selectedDays.filter(v => v !== chosen)
      : [...selectedDays, chosen].sort((a, b) => a - b);
    setSelectedDays(next);
    setDay(next.includes(chosen) ? chosen : (next[0] || chosen));
    setError("");
  };
  const pick = id => {
    if (saving || blocked || !allKnown.has(id)) return;
    setReturnNotice(false);
    setSelection(current => togglePlaceSelection(current, id));
  };
  const openPlace = place => {
    navigate("/detail?id=" + encodeURIComponent(place.id), {
      state: { from: "/route-add-places?id=" + encodeURIComponent(tripId) + "&day=" + actualDay +
        (optimizedMode ? "&version=optimized" : "") + originSuffix,
        place: { ...place, id: place.id, placeId: place.id } },
    });
  };
  const submit = async (confirmed = false) => {
    if (busy.current || blocked || !selectedIds.length || !appliedDays.length || !alive()) return;
    busy.current = true; setSaving(true); setError("");
    let completed = 0;
    try {
      const latest = await getTripPlacesApi(tripId);
      if (!alive()) return;
      setTripPlaces(latest);
      const versions = optimizedMode ? readOptimizedVersions(tripId, account, latest) : {};
      if (optimizedMode && appliedDays.some(dayNumber => !versions[String(dayNumber)])) {
        throw new Error("선택한 일차에 아직 최적화안이 없어요. 먼저 그 일차의 경로를 최적화해 주세요.");
      }
      const duplicates = optimizedMode
        ? appliedDays.flatMap(dayNumber => {
          const draft = versions[String(dayNumber)];
          const ids = new Set(draft.order.map(key =>
            Number(draft.sourcePlaces?.[String(key)]?.placeId ??
              latest.find(place => String(place.tripPlaceId ?? place.id) === String(key))?.placeId ??
              draft.addedPlaces?.[String(key)]?.placeId)));
          return selectedIds.filter(id => ids.has(id))
            .map(id => ({ day: dayNumber, id, name: allKnown.get(id)?.name || "장소 " + id }));
        }) : duplicatesFor(latest);
      const sameWarning = confirmed && duplicateConfirm &&
        duplicates.map(item => item.day + ":" + item.id).sort().join("|") ===
        duplicateConfirm.map(item => item.day + ":" + item.id).sort().join("|");
      // Authorize only the duplicates actually shown in this confirmation.
      if (duplicates.length && !sameWarning) {
        setDuplicateConfirm(duplicates);
        return;
      }
      setDuplicateConfirm(null);
      if (optimizedMode) {
        // Browser-local optimized visits must NEVER call the original TripPlace POST.
        const changedDays = {};
        for (const dayNumber of appliedDays) {
          let next = versions[String(dayNumber)];
          for (const selectedId of selectedIds) {
            const place = allKnown.get(selectedId);
            next = addOptimizedPlace(next, place);
            if (!next) throw new Error("추가할 장소 정보를 확인하지 못했어요.");
          }
          changedDays[dayNumber] = next;
        }
        if (!saveOptimizedDays(tripId, account, latest, changedDays)) {
          throw new Error("최적화한 일정에 저장하지 못했어요. 저장 공간을 확인해 주세요.");
        }
        setSelection([]);
        setReturnNotice(true);
        return;
      }
      for (const dayNumber of appliedDays) {
        let next = latest.filter(p => Number(p.day) === dayNumber)
          .reduce((max, p) => Math.max(max, Number(p.visitOrder)), 0) + 1;
        for (const id of selectedIds) {
          if (!alive()) return;
          await addPlaceToTripApi({ tripId, placeId: id, day: dayNumber, visitOrder: next });
          completed++;
          next++;
        }
      }
      // Readback after successful writes is critical for further duplicate selection.
      const reloaded = await getTripPlacesApi(tripId);
      if (!alive()) return;
      setTripPlaces(reloaded);
      setSelection([]);
      setReturnNotice(true);
    } catch (e) {
      if (!alive()) return;
      if (completed > 0 || uncertainMutation(e)) {
        setBlocked(true);
        setError(completed + "개 요청 후 결과를 확실히 확인하지 못했어요. 일정에서 저장 상태를 확인해 주세요.");
      } else {
        setError(e?.message || "장소 추가를 완료하지 못했어요.");
      }
    } finally {
      busy.current = false;
      if (alive()) setSaving(false);
    }
  };
  if (!/^[1-9]\d*$/.test(String(tripId || ""))) return <main className="v166-page"><p role="alert">유효한 여행 ID가 필요해요.</p></main>;
  return <main className={"v166-page" + (selectedIds.length || returnNotice ? " has-selection" : "")}>

    {status === "loading" && <p role="status" className="v166-message">여행 장소를 불러오는 중...</p>}
    {status === "error" && <div role="alert" className="v166-message">{error}
      <button type="button" onClick={() => void load()}>다시 조회</button>
    </div>}
    {status === "success" && <>
      <section className="v166-days" aria-label="추가 날짜 선택">

        <div className="v166-day-strip">
          {days.map(item => <button type="button" key={item.day}
            className={selectedDays.includes(item.day) ? "is-active" : ""} aria-pressed={selectedDays.includes(item.day)}
            disabled={saving || blocked} onClick={() => chooseDay(item.day)}>
            <strong>{item.label}</strong><small>{item.dateLabel}</small>
          </button>)}
        </div>
      </section>
      <div className="v166-search-wrap">
        <SearchIcon/>
        <input type="search" aria-label={destination.name + " 장소 검색"} value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={destination.name + "에서 장소 검색"} maxLength={100}/>
        {query && <button type="button" aria-label="검색어 지우기" onClick={() => setQuery("")}>×</button>}
      </div>
      <div className="v166-category-strip" role="group" aria-label="장소 분류">
        {PLACE_CATEGORIES.map(item => <button key={item.key} type="button"
          className={category === item.key ? "is-active" : ""} aria-pressed={category === item.key}
          onClick={() => setCategory(item.key)}>{item.label}</button>)}
      </div>
      <section className="v166-collection">
        <h2>내 장소에서 찾기</h2>
        <div className="v166-source-strip" role="group" aria-label="내 장소 목록">
          <button type="button" className={source === "all" ? "is-selected" : ""}
            aria-pressed={source === "all"} onClick={() => { setSource("all"); setQuery(""); }}>전체</button>
          {sources.map(item => <button type="button" key={item.id}
            className={(source === item.id ? "is-selected " : "") + (item.id.startsWith("folder:") && item.count === 0 ? "is-unrelated" : "")}
            aria-pressed={source === item.id} onClick={() => {setSource(item.id);setQuery("");}}>
            {item.name}</button>)}
        </div>
        <p className="v166-caption">{query ? destination.name + " 지역의 검색 결과" :
          (source === "all" ? "전체 장소" : currentSource?.name || "내 장소") + " · " + visible.length + "곳"}</p>
      </section>
      {engagementError && <p className="v166-subtle" role="status">좋아요·리뷰 정보를 불러오지 못했어요.</p>}
      {visible.length ? <ul className="v166-results" aria-label="장소 목록">
        {visible.map(place => <PlaceItem key={place.id} place={place}
          engagement={engagement[place.id]} selected={selectedIds.includes(place.id)}
          already={optimizedMode ? selectedDays.length > 0 && selectedDays.every(targetDay =>
              optimizedIdsByDay[String(targetDay)]?.has(Number(place.id))) :
            selectedDays.length > 0 && selectedDays.every(targetDay =>
             tripPlaces.some(visit => Number(visit.day) === targetDay && Number(visit.placeId) === Number(place.id)))} onToggle={pick} onDetail={openPlace}/>)}
      </ul> : <div className="v166-no-results">
        {query ? "해당 지역에서 검색된 장소가 없어요." :
          source === "all" ? destination.name + "에 등록된 장소가 없어요." :
          source === "hotel" ? destination.name + "에 저장한 숙소가 없어요. 숙박 분류에서 장소를 검색해 보세요." :
          source === "favorites" ? destination.name + "에서 좋아하는 장소가 아직 없어요." :
          "이 폴더에 " + destination.name + " 장소가 없어요."}
      </div>}
      {createPortal(<div className={"v166-cart-dock" + (selectedIds.length || returnNotice ? " is-visible" : "")}
        aria-label="장소 선택 및 저장" aria-hidden={!selectedIds.length && !returnNotice}
        inert={!selectedIds.length && !returnNotice}>
        {returnNotice && !selectedIds.length ? <button type="button" className="v166-confirm"
          onClick={() => navigate(optimizedMode ? returnToEditor() : pickerReturnPath(tripId, actualDay))}>✓ 일정 편집으로 돌아가기</button> :
          selectedIds.length > 0 && <>
            <div className="v166-cart-chips">
              {selectedIds.map(id => <button type="button" key={id}
                onClick={() => pick(id)} aria-label={(allKnown.get(id)?.name || id) + " 선택 해제"}>
                {allKnown.get(id)?.name || "장소 " + id} <span aria-hidden="true">×</span>
              </button>)}
            </div>
            <button type="button" className="v166-confirm" disabled={saving || blocked || !validDays.length}
              onClick={() => void submit()}>
              {saving ? "추가하는 중..." : selectedIds.length + "곳 선택 완료"}
            </button>
          </>}
        {error && <p role="alert" className="v166-save-error">{error}</p>}
      </div>, document.body)}
      {duplicateConfirm && createPortal(<div className="v166-duplicate-overlay">
        <div className="v166-duplicate-dialog" role="alertdialog" aria-modal="true"
          aria-label="중복 장소 추가 확인">
          <strong>이미 이 날짜에 있는 장소가 있어요</strong>
          <p>다음 일차에 이미 등록된 장소가 있어요.</p>
          <ul className="v166-duplicate-days">
            {[...new Set(duplicateConfirm.map(item => item.day))].sort((a, b) => a - b).map(dayNumber =>
              <li key={dayNumber}>
                <strong className="v166-duplicate-day-label">{dayNumber}일차</strong>
                <span>{duplicateConfirm.filter(item => item.day === dayNumber).map(item => item.name).join(", ")}</span>
              </li>)}
          </ul>
          <p>선택 완료하면 같은 일차에 해당 장소가 다시 추가돼요. 계속할까요?</p>
          <div>
            <button type="button" onClick={() => setDuplicateConfirm(null)}>취소</button>
            <button type="button" onClick={() => void submit(true)}>중복 포함 추가</button>
          </div>
        </div>
      </div>, document.body)}

    </>}
  </main>;
}
