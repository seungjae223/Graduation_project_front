let kakaoMapsLoadingPromise = null;

export const loadKakaoMapsScript = () => {
  if (window.kakao?.maps?.services) {
    return Promise.resolve(window.kakao);
  }

  if (kakaoMapsLoadingPromise) {
    return kakaoMapsLoadingPromise;
  }

  kakaoMapsLoadingPromise = new Promise((resolve, reject) => {
    const appKey = process.env.REACT_APP_KAKAO_MAP_JS_KEY;

    if (!appKey) {
      reject(new Error("카카오맵 JS 키가 없습니다."));
      return;
    }

    const initialize = () => {
      if (!window.kakao?.maps?.load) {
        reject(new Error("카카오맵 SDK 초기화에 실패했습니다."));
        return;
      }

      window.kakao.maps.load(() => {
        if (window.kakao?.maps?.services) {
          resolve(window.kakao);
        } else {
          reject(new Error("카카오맵 services 라이브러리를 찾지 못했습니다."));
        }
      });
    };

    const existingScript = document.querySelector(
      'script[data-kakao-maps="true"]'
    );

    if (existingScript) {
      if (window.kakao?.maps?.services) {
        resolve(window.kakao);
        return;
      }

      if (window.kakao?.maps?.load) {
        initialize();
        return;
      }

      existingScript.addEventListener("load", initialize, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("카카오맵 SDK 로드 실패")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src =
      `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}` +
      `&autoload=false&libraries=services`;
    script.async = true;
    script.defer = true;
    script.dataset.kakaoMaps = "true";
    script.onload = initialize;
    script.onerror = () => reject(new Error("카카오맵 SDK 로드 실패"));

    document.head.appendChild(script);
  }).catch((error) => {
    kakaoMapsLoadingPromise = null;
    throw error;
  });

  return kakaoMapsLoadingPromise;
};