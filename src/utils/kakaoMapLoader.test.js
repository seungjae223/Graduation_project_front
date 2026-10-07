let loadKakaoMapsScript;

beforeEach(() => {
  jest.isolateModules(() => { loadKakaoMapsScript = require("./kakaoMapLoader").loadKakaoMapsScript; });
  process.env.REACT_APP_KAKAO_MAP_JS_KEY = "test-key";
  delete window.kakao;
  jest.useFakeTimers();
});
afterEach(() => {
  document.querySelectorAll('script[data-kakao-maps="true"]').forEach(script => script.remove());
  delete window.kakao;
  delete process.env.REACT_APP_KAKAO_MAP_JS_KEY;
  jest.useRealTimers();
});

test("concurrent consumers share a script and maps.load initialization", async () => {
  const first = loadKakaoMapsScript();
  expect(loadKakaoMapsScript()).toBe(first);
  const script = document.querySelector('script[data-kakao-maps="true"]');
  expect(script.src).toContain("autoload=false&libraries=services");
  const load = jest.fn(callback => { window.kakao.maps.services = {}; callback(); });
  window.kakao = { maps: { load } };
  script.dispatchEvent(new Event("load"));
  await expect(first).resolves.toBe(window.kakao);
  expect(load).toHaveBeenCalledTimes(1);
});

test("failed load removes its script and a new visit retries", async () => {
  const first = loadKakaoMapsScript();
  const script = document.querySelector('script[data-kakao-maps="true"]');
  script.dispatchEvent(new Event("error"));
  await expect(first).rejects.toThrow("로드 실패");
  expect(script.isConnected).toBe(false);
  const retry = loadKakaoMapsScript();
  jest.advanceTimersByTime(15000);
  await expect(retry).rejects.toThrow("시간 초과");
  expect(document.querySelector('script[data-kakao-maps="true"]')).toBeNull();
});

test("missing key fails without injecting a script", async () => {
  delete process.env.REACT_APP_KAKAO_MAP_JS_KEY;
  await expect(loadKakaoMapsScript()).rejects.toThrow("키가 없습니다");
  expect(document.querySelector('script[data-kakao-maps="true"]')).toBeNull();
});
