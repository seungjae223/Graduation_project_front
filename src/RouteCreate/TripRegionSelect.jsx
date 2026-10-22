import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Navigate, useNavigate } from "react-router-dom";
import { getDestinationsApi } from "../api/destinationApi";
import { createTripApi, getTripsApi } from "../api/tripApi";
import { getDestinationHero } from "../Destinations/destinationHeroPhotos";
import { requireSearchDestinations } from "../Search/destinationSearch";
import { filterDestinationCatalog } from "../data/destinationPresentation";
import useReadQuery from "../utils/useReadQuery";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import { uncertainMutation } from "../utils/useMutationTask";
import { readDateDraft,clearDateDraft } from "./tripCreationDraft";
import { findConfirmedCreatedTrip } from "./tripCreationReconcile";
import "../Recommend/Recommend.css";
import "./TripRegionSelect.css";

function SelectableDestination({ destination, selected, onSelect }) {
  const [imageFailed,setImageFailed] = useState(false);
  const hero = getDestinationHero(destination.code);
  return <li className={"v16-region-item"+(selected?" is-selected":"")}>
    <button type="button" className="v16-region-card"
      aria-label={destination.name} aria-pressed={selected} onClick={()=>onSelect(destination.code)}>
      <span className="v16-region-photo">
        {hero && !imageFailed
          ? <img src={hero.src} alt="" loading="lazy" decoding="async" style={{ objectPosition: hero.position }}
              onError={()=>setImageFailed(true)} />
          : <span className="v16-region-photo-fallback" aria-hidden="true"/>}
      </span>
      <span className="v16-region-copy"><small>{destination.countryName}</small><strong>{destination.name}</strong></span>
    </button>
    {hero && !imageFailed && <a className="v16-region-credit" href={hero.source}
      target="_blank" rel="noopener noreferrer" aria-label={destination.name+" 대표 사진 출처"}
      title={`${hero.author} · ${hero.license} (가로 크롭 표시)`}>사진 출처</a>}
  </li>;
}

export default function TripRegionSelect() {
  const navigate = useNavigate();
  const account = useSessionKey();
  const draft = readDateDraft(account);
  const catalog = useReadQuery("v16-region:"+account,
    async signal=>requireSearchDestinations(await getDestinationsApi({ signal })),
    account !== "anonymous",()=>getAuthSnapshot().accountKey === account);
  const [scope,setScope] = useState("OVERSEAS");
  const [group,setGroup] = useState("all");
  const [selection,setSelection] = useState("");
  const [busy,setBusy] = useState(false);
  const [blocked,setBlocked] = useState(false);
  const [error,setError] = useState("");
  const running = useRef(false);
  // Clearing the draft after a successful POST must not trigger this page's
  // missing-draft redirect before React Router finishes the result navigation.
  // Scope the completion marker to the account that created the trip.
  const completedForAccount = useRef(null);
  const destinations = catalog.data || [];
  const { visible,groups } = filterDestinationCatalog(destinations,scope,group);
  const chooseScope = value => {setScope(value);setGroup("all");setSelection("");setError("");};
  const chooseGroup = value => {setGroup(value);setSelection("");setError("");};
  if (!draft && completedForAccount.current !== account)
    return <Navigate to="/route-create" replace />;
  const selected = destinations.find(item=>item.code===selection);
  const next = async () => {
    if (!selected || running.current || busy || blocked) return;
    if (getAuthSnapshot().accountKey !== account) return;
    const currentDraft = readDateDraft(account);
    if (!currentDraft) { navigate("/route-create",{replace:true});return; }
    const request = {
      title: selected.name + " 여행", destination: selected.name,
      startDate: currentDraft.startDate, endDate: currentDraft.endDate,
      latitude: null, longitude: null,
    };
    running.current = true;
    setBusy(true);
    setError("");

    const ownerStillActive = () => getAuthSnapshot().accountKey === account;
    const enterSavedTrip = id => {
      if (!ownerStillActive()) return;
      completedForAccount.current = account;
      clearDateDraft(account);
      navigate("/route-result?id=" + encodeURIComponent(id), { replace:true });
    };
    try {
      // Snapshot known IDs BEFORE writing. Never reuse an existing matching trip
      // when an uncertain POST may or may not have committed.
      let before;
      try {
        before = await getTripsApi();
      } catch {
        if (ownerStillActive()) setError("일정 목록을 확인하지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.");
        return;
      }
      if (!ownerStillActive()) return;
      let created;
      let writeError = null;
      try {
        created = await createTripApi(request);
      } catch (error) {
        writeError = error;
      }
      if (!ownerStillActive()) return;
      const id = Number(created?.id);
      if (!writeError && Number.isSafeInteger(id) && id > 0) {
        enterSavedTrip(id);
        return;
      }

      // Read-only recovery only; this NEVER posts again. A unique NEW matching
      // server record is sufficient to navigate even if its POST response was lost.
      if (!writeError || uncertainMutation(writeError)) {
        try {
          const after = await getTripsApi();
          if (!ownerStillActive()) return;
          const recovered = findConfirmedCreatedTrip(before, after, request);
          if (recovered) {
            enterSavedTrip(recovered.id);
            return;
          }
        } catch { /* Can't confirm; leave the write blocked. */ }
        if (!ownerStillActive()) return;
        setBlocked(true);
        const status = Number(writeError?.response?.status);
        setError("저장 결과를 확인하지 못했어요" +
          (Number.isInteger(status) && status >= 100 && status <= 599 ? " (HTTP " + status + ")" : "") +
          ". 중복 생성을 막기 위해 다시 요청하지 않습니다. 일정 목록을 확인해 주세요.");
      } else {
        const status = Number(writeError?.response?.status);
        setError(status === 401 || status === 403
          ? "로그인 정보를 확인한 뒤 다시 시도해 주세요."
          : status === 400 || status === 422
            ? "선택한 날짜와 여행지를 저장할 수 없어요. 입력을 확인해 주세요."
            : "서버에서 일정을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      running.current = false;
      if (ownerStillActive()) setBusy(false);
    }
  };

  return <>
  <main className="v16-create-region">
    <header className="v16-create-region-heading"><h1>어디로 떠날까요?</h1></header>
    <div className="recommend-scope-tabs" role="group" aria-label="국내 해외 선택">
      <button type="button" aria-pressed={scope==="OVERSEAS"} onClick={()=>chooseScope("OVERSEAS")}>해외</button>
      <button type="button" aria-pressed={scope==="DOMESTIC"} onClick={()=>chooseScope("DOMESTIC")}>국내</button>
    </div>
    <div className="recommend-region-chips" role="group" aria-label="여행 지역">
      {groups.map(item=><button key={item.key} type="button" aria-pressed={group===item.key}
        onClick={()=>chooseGroup(item.key)}>{item.label}</button>)}
    </div>
    {catalog.status==="loading" && <p role="status" className="recommend-destination-state">여행지를 불러오는 중...</p>}
    {catalog.status==="error" && <div role="alert" className="recommend-destination-state">
      여행지를 불러오지 못했어요. <button type="button" onClick={catalog.retry}>다시 조회</button>
    </div>}
    {catalog.status==="success" && visible.length===0 && <p className="recommend-destination-state">등록된 여행지가 없어요.</p>}
    {visible.length>0 && <ul className="v16-region-grid">
      {visible.map(dest=><SelectableDestination key={dest.code} destination={dest}
        selected={selection===dest.code} onSelect={setSelection}/>)}
    </ul>}
  </main>
  {createPortal(<div className={"v16-region-next"+(selected||blocked?" is-visible":"")}
    aria-hidden={!selected&&!blocked} inert={!selected&&!blocked}>
    {error && <div className="v16-region-error" role="alert">{error}</div>}
    {blocked ? <button type="button" onClick={()=>navigate("/schedule")}>일정 목록 확인</button>
      : <button type="button" onClick={next} disabled={busy} aria-label="다음">
        {busy?"일정 생성 중...":"다음"}
      </button>}
  </div>, document.body)}
  </>;
}
