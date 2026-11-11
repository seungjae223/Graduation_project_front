import "./actionButtonMotion.css";

const actionLinks = [
  "a.not-found-action", "a.home-text-action", "a.home-trip-continue", "a.home-city-link",
  "a.mypage-v14-item", "a.mypage-v14-profile-link", "a.mypage-v14-account-link",
  "a.mypage-v14-forgot", "a.detail-directions-btn", "a.recommend-destination-link",
  "a.verify-code-login", "a.signup-footer-link", ".mypage-v14-review-actions a",
  ".mypage-v14-empty a", "a.popular-place-link", ".login-options a.link", ".signup a",
];
const controlSelector = [
  "button", '[role="button"]', 'input:is([type="button"], [type="submit"], [type="reset"], [type="image"])',
  ...actionLinks,
].join(", ");
const overlaySelector = ".home-hot-open, .place-photo-card-action, .v166-photo-detail, .home-city-link";
const iconSelector = '.heart-container, svg, img, [aria-hidden="true"], [class*="-arrow"], [class*="-icon"]';
const photoSelector = '[class*="-photo"], [class*="-thumb"], [class*="-media"]';
const glyphOnly = /^(?:[^\p{L}\p{N}]+|\d+(?:\s*(?:일차|일|월|점|분|개|페이지))?)$/u;
const iconRules = [
  ["close", /닫기|취소|close|dismiss/i],
  ["back", /뒤로|이전|돌아가|prev|\bback\b/i],
  ["refresh", /다시|새로고침|재조회|재전송|갱신|retry|refresh/i],
  ["delete", /삭제|제거|delete|remove|trash/i],
  ["download", /다운로드|내보내기|인쇄|pdf|export|download/i],
  ["share", /공유|share/i],
  ["copy", /복사|copy/i],
  ["logout", /로그아웃|logout/i],
  ["login", /로그인|login|sign-in/i],
  ["register", /회원가입|sign-up/i],
  ["lock", /비밀번호|잠금|password|lock/i],
  ["search", /검색|search/i],
  ["sort", /정렬|기본순|별점순|거리순|리뷰순|좋아요순|sort/i],
  ["globe", /^해외$|해외 여행|global/i],
  ["map", /^국내$|지도|길찾기|현재 위치|위치 선택|map|direction/i],
  ["edit", /수정|편집|변경|edit|rename/i],
  ["folder", /폴더|folder/i],
  ["save", /저장|save/i],
  ["add", /추가|만들기|새 일정|새 여행|new-|add|create/i],
  ["mail", /이메일|인증번호|메일|email|verify/i],
  ["send", /보내기|전송|제출|등록|send|submit/i],
  ["check", /확인|완료|적용|선택|동의|confirm|apply|done/i],
  ["filter", /필터|카테고리|filter|chip/i],
  ["file", /리뷰 작성|문의 작성|문서 보기|약관|첨부|업로드|upload/i],
  ["more", /더 보기|더보기|메뉴|ellipsis|more|menu/i],
];

function existingIcon(control) {
  if (control.matches(".v14-saved-folder-hit-area")) {
    return control.parentElement?.querySelector(".v14-saved-folder-icon");
  }
  if (control.matches(overlaySelector)) return null;
  return [...control.querySelectorAll(iconSelector)].find(node => {
    if (node.closest(controlSelector) !== control || node.closest("[hidden]")) return false;
    const photo = node.closest(photoSelector);
    if (photo && photo !== control && control.contains(photo)) return false;
    if (node.matches("svg, img, .heart-container")) return true;
    const glyph = node.textContent.trim();
    return node.childElementCount === 0 && glyph && glyphOnly.test(glyph);
  });
}

function prepare(control) {
  if (control.closest(".gm-style") || control.matches(".fix-point-backdrop") || control.querySelector("[data-useanimations]")) {
    control.removeAttribute("data-button-icon");
    return null;
  }

  const icon = existingIcon(control);
  const text = control.textContent.trim();
  const needsIcon = !icon && control.tagName !== "INPUT" && !glyphOnly.test(text) &&
    (text || control.matches(overlaySelector) || !control.matches('[class*="dot"]'));
  if (needsIcon) {
    const label = control.getAttribute("aria-label") || text || control.getAttribute("title") || "";
    const matchingAction = iconRules.find(([, pattern]) => pattern.test(label)) ||
      iconRules.find(([, pattern]) => pattern.test(control.className));
    const selection = control.getAttribute("aria-pressed");
    const fallback = selection === null ? "next" : "filter";
    const name = control.matches(".place-photo-card-action") && selection !== null
      ? selection === "true" ? "check" : "add" : matchingAction?.[0] || fallback;
    if (control.getAttribute("data-button-icon") !== name) control.setAttribute("data-button-icon", name);
  } else {
    control.removeAttribute("data-button-icon");
  }
  return icon || control;
}

export default function installActionButtonMotion(root) {
  const targets = new WeakMap();
  const animations = new WeakMap();
  const prepareControl = control => targets.set(control, prepare(control));
  root.querySelectorAll(controlSelector).forEach(prepareControl);

  // Lazy routes, dialogs rendered in portals, and buttons whose labels change use the same rules.
  const observer = new MutationObserver(records => {
    const changed = new Set();
    for (const record of records) {
      const element = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      const control = element?.closest(controlSelector);
      if (control) changed.add(control);
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches(controlSelector)) changed.add(node);
        node.querySelectorAll(controlSelector).forEach(button => changed.add(button));
      }
    }
    changed.forEach(control => { if (root.contains(control)) prepareControl(control); });
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ["aria-label", "aria-pressed", "class", "role", "type"] });

  const getControl = event => event.target.closest?.(controlSelector);
  const play = control => {
    if (!control || control.matches(':disabled, [aria-disabled="true"]') || control.closest("[inert]") ||
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (!targets.has(control)) prepareControl(control);
    const target = targets.get(control);
    if (!target) return;

    if (control.hasAttribute("data-button-icon")) {
      const next = control.getAttribute("data-button-feedback") === "first" ? "second" : "first";
      control.setAttribute("data-button-feedback", next);
      return;
    }
    const frames = target === control
      ? [{ scale: 1 }, { scale: 1.055, offset: 0.38 }, { scale: 1 }]
      : [{ scale: 1, rotate: "0deg" }, { scale: 0.84, rotate: "-10deg", offset: 0.27 },
        { scale: 1.13, rotate: "6deg", offset: 0.64 }, { scale: 1, rotate: "0deg" }];
    animations.get(target)?.cancel();
    animations.set(target, target.animate?.(frames, { duration: 320, easing: "ease-out" }));
  };

  const hover = event => {
    const control = getControl(event);
    if (event.pointerType === "mouse" && control &&
        (!(event.relatedTarget instanceof Node) || !control.contains(event.relatedTarget))) play(control);
  };
  const press = event => { if (event.button === 0) play(getControl(event)); };
  const focus = event => {
    const control = getControl(event);
    if (control?.matches(":focus-visible")) play(control);
  };
  const keyboardClick = event => { if (event.detail === 0) play(getControl(event)); };
  root.addEventListener("pointerover", hover, true);
  root.addEventListener("pointerdown", press, true);
  root.addEventListener("focusin", focus, true);
  root.addEventListener("click", keyboardClick, true);
  return () => {
    observer.disconnect();
    root.removeEventListener("pointerover", hover, true);
    root.removeEventListener("pointerdown", press, true);
    root.removeEventListener("focusin", focus, true);
    root.removeEventListener("click", keyboardClick, true);
  };
}
