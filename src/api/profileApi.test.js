import { normalizeMyProfile } from "./profileApi";

test.each(["KAKAO", "GOOGLE", "LOCAL"])("internal email is hidden for provider %s regardless of case", provider => {
  expect(normalizeMyProfile({ nickname: "사용자", email: "internal@NOMANGO.LOCAL", emailAvailable: true, provider }))
    .toEqual({ nickname: "사용자", email: null, emailAvailable: false, provider });
});

test.each([{}, [], null, "<html>login</html>", { nickname: "이름", provider: "LOCAL", emailAvailable: true, email: null }])("malformed profile cannot become a successful empty user", data => {
  expect(() => normalizeMyProfile(data)).toThrow("프로필 응답");
});
