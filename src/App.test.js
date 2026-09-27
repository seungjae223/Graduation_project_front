import { getApiErrorMessage } from "./api/api";
import {
  buildLoginPath,
  getReturnPathFromSearch,
  isSafeInternalPath,
} from "./utils/authRedirect";

describe("API 오류 메시지 처리", () => {
  test("백엔드 JSON message를 표시한다", () => {
    const error = {
      response: {
        status: 400,
        data: { message: "검색어를 입력해주세요." },
      },
    };

    expect(getApiErrorMessage(error, "요청 실패")).toBe(
      "검색어를 입력해주세요."
    );
  });

  test("문자열 응답과 body 없는 응답을 모두 처리한다", () => {
    expect(
      getApiErrorMessage({ response: { data: "인증번호가 틀렸습니다." } })
    ).toBe("인증번호가 틀렸습니다.");

    expect(getApiErrorMessage({ response: { status: 401 } }, "로그인 필요")).toBe(
      "로그인 필요"
    );
  });

  test("Google OAuth 설정 누락 503의 안전한 메시지를 표시한다", () => {
    const error = {
      response: {
        status: 503,
        data: {
          message: "소셜 로그인 서비스 설정이 완료되지 않았습니다.",
        },
      },
    };

    expect(getApiErrorMessage(error, "소셜 로그인을 시작하지 못했습니다.")).toBe(
      "소셜 로그인 서비스 설정이 완료되지 않았습니다."
    );
  });
});

describe("로그인 후 복귀 경로", () => {
  test("서비스 내부 경로만 로그인 복귀 주소로 사용한다", () => {
    expect(isSafeInternalPath("/detail?id=12")).toBe(true);
    expect(isSafeInternalPath("https://example.com")).toBe(false);
    expect(isSafeInternalPath("//example.com/path")).toBe(false);
  });

  test("안전하지 않은 복귀 주소는 홈으로 대체한다", () => {
    expect(
      getReturnPathFromSearch(
        `?returnTo=${encodeURIComponent("https://example.com")}`
      )
    ).toBe("/home");
    expect(buildLoginPath("/mypage")).toBe(
      "/login?returnTo=%2Fmypage"
    );
  });
});
