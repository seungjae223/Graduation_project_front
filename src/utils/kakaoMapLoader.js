let loadingPromise = null;
export const loadKakaoMapsScript = () => {
  if (window.kakao?.maps?.services) return Promise.resolve(window.kakao);
  if (loadingPromise) return loadingPromise;
  const appKey = process.env.REACT_APP_KAKAO_MAP_JS_KEY || process.env.REACT_APP_KAKao_MAP_JS_KEY;
  if (!appKey) return Promise.reject(new Error("카카오맵 JS 키가 없습니다."));
  loadingPromise = new Promise((resolve, reject) => {
    let script = document.querySelector('script[data-kakao-maps="true"], script[src*="dapi.kakao.com/v2/maps/sdk.js"]');
    const owned = !script || script.dataset.kakaoMaps === "true";
    if (!script) {
      script = document.createElement("script");
      script.src = "https://dapi.kakao.com/v2/maps/sdk.js?appkey=" + encodeURIComponent(appKey) + "&autoload=false&libraries=services";
      script.async = true;
      script.dataset.kakaoMaps = "true";
    }
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.removeEventListener("load", initialize);
      script.removeEventListener("error", fail);
      if (error) {
        if (owned) script.remove();
        reject(error);
      } else resolve(window.kakao);
    };
    const initialize = () => {
      if (!window.kakao?.maps?.load) return finish(new Error("카카오맵 SDK 초기화에 실패했습니다."));
      try {
        window.kakao.maps.load(() => finish(window.kakao?.maps?.services ? null : new Error("카카오맵 services 라이브러리를 찾지 못했습니다.")));
      } catch (error) { finish(error); }
    };
    const fail = () => finish(new Error("카카오맵 SDK 로드 실패"));
    const timer = setTimeout(() => finish(new Error("카카오맵 SDK 로드 시간 초과")), 15000);
    script.addEventListener("load", initialize);
    script.addEventListener("error", fail);
    if (window.kakao?.maps?.load) initialize();
    else if (!script.isConnected) document.head.appendChild(script);
  }).catch(error => { loadingPromise = null; throw error; });
  return loadingPromise;
};
