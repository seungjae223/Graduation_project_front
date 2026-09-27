import "./App.css";
import "./animations/onboardingButtonMotion.css";
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import Header from "./Header/Header";
import Footer from "./Footer/Footer";
import SearchPop from "./SearchPopup/SearchPop";
import EarthLoader from "./Loading/EarthLoader";
import { SavedPlacesProvider } from "./Context/SavedPlacesContext";
import { getAccessToken } from "./api/api";
import { buildLoginPath } from "./utils/authRedirect";
import OnBoarding from "./OnBoarding/OnBoarding";
import OnBoarding2 from "./OnBoarding/OnBoarding2";
import OnBoarding3 from "./OnBoarding/OnBoarding3";

// 관리자 전용 푸터
import AdminFooter from "./Admin/AdminFooter/AdminFooter";

// 온보딩은 페이지 전환 스냅샷을 즉시 만들 수 있도록 먼저 로드한다.
const Landing = lazy(() => import("./Landingpage/Landing"));

const Login = lazy(() => import("./Login/Login"));
const FindPassword = lazy(() => import("./Login/FindPassword"));
const VerifyCode = lazy(() => import("./Login/VerifyCode"));
const SignUp = lazy(() => import("./Login/SignUp"));
const OAuthCallback = lazy(() => import("./Login/OAuthCallback"));

const Home = lazy(() => import("./Homepage/Home"));
const Search = lazy(() => import("./Search/Search"));
const Recommend = lazy(() => import("./Recommend/Recommend"));
const Total = lazy(() => import("./Recommend/Total"));
const Detail = lazy(() => import("./Recommend/Detail"));
const PopularAll = lazy(() => import("./Homepage/PopularAll"));

const MyPage = lazy(() => import("./Mypage/MyPage"));
const SavedPlaces = lazy(() => import("./Mypage/SavedPlaces"));
const RecentPlacesPage = lazy(() =>
  import("./RecentPlacesPage/RecentPlacesPage")
);
const MySchedule = lazy(() => import("./MySchedule/MySchedule"));

const RouteCreate = lazy(() => import("./RouteCreate/RouteCreate"));
const RouteResult = lazy(() => import("./RouteResult/RouteResult"));
const Schedule = lazy(() => import("./Schedule/Schedule"));

const Inquiry = lazy(() => import("./Mypage/Inquiry"));
const InquiryWrite = lazy(() => import("./Mypage/InquiryWrite"));
const InquiryDetail = lazy(() => import("./Mypage/InquiryDetail"));

// 관리자 페이지
const AdminMain = lazy(() => import("./Admin/AdminMain/AdminMain"));
const AdminInquiry = lazy(() =>
  import("./Admin/AdminInquiryPage/AdminInquiryPage")
);
const AdminInquiryWrite = lazy(() =>
  import("./Admin/AdminInquiryPage/AdminInquiryWrite")
);

function RequireAuth({ children }) {
  const location = useLocation();

  if (!getAccessToken()) {
    const returnPath = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={buildLoginPath(returnPath)} replace />;
  }

  return children;
}

function NotFound() {
  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <div className="not-found-card">
        <span className="not-found-code" aria-hidden="true">404</span>
        <h1 id="not-found-title">페이지를 찾을 수 없습니다</h1>
        <p>주소가 잘못되었거나 페이지가 이동되었을 수 있어요.</p>
        <Link className="not-found-action" to="/onboarding">
          시작 화면으로 돌아가기
        </Link>
      </div>
    </section>
  );
}

function Layout() {
  const location = useLocation();
  const [isSearchPopOpen, setIsSearchPopOpen] = useState(false);
  const previousPathRef = useRef(null);

  useEffect(() => {
    setIsSearchPopOpen(false);
  }, [location.pathname]);

  const pathname = location.pathname.toLowerCase();
  const isAdminPage = pathname.startsWith("/admin");
  const hasAccessToken = Boolean(getAccessToken());
  const isOAuthCallbackPage =
    pathname.startsWith("/oauth/") && pathname.endsWith("/callback");

  const onboardingDirection = useMemo(() => {
    const onboardingOrder = ["/", "/onboarding", "/onboarding2", "/onboarding3"];
    const currentIndex = onboardingOrder.indexOf(pathname);
    const previousIndex = onboardingOrder.indexOf(previousPathRef.current);

    if (currentIndex < 0 || previousIndex < 0 || currentIndex === previousIndex) {
      return "neutral";
    }

    return currentIndex > previousIndex ? "forward" : "backward";
  }, [pathname]);

  useEffect(() => {
    previousPathRef.current = pathname;
  }, [pathname]);

  const hideFooterPaths = [
    "/",
    "/onboarding",
    "/onboarding2",
    "/onboarding3",
    "/login",
    "/find-password",
    "/verify-code",
    "/landing",
    "/detail",
    "/signup",
  ];

  const hideHeaderPaths = ["/login"];

  const shouldHideFooter = hideFooterPaths.includes(pathname);
  const shouldShowDefaultFooter =
    !shouldHideFooter && !isAdminPage && !isOAuthCallbackPage;
  const shouldShowAdminFooter = isAdminPage && hasAccessToken;

  // 로그인, 관리자 화면에서만 Header 숨김
  // 랜딩, 온보딩, 온보딩2, 온보딩3, 이메일 인증 관련 화면에서는 Header 보임
  const shouldHideHeader =
    hideHeaderPaths.includes(pathname) || isAdminPage || isOAuthCallbackPage;

  return (
    <div className="app">
      {!shouldHideHeader && (
        <Header onSearchClick={() => setIsSearchPopOpen(true)} />
      )}

      <main
        className={`app-content ${
          shouldShowDefaultFooter || shouldShowAdminFooter ? "with-footer" : ""
        }`}
      >
        <div
          key={location.pathname}
          className={`route-transition ${
            pathname === "/" || pathname.startsWith("/onboarding")
              ? `onboarding-route onboarding-route--${onboardingDirection}`
              : ""
          }`}
        >
          <Suspense fallback={<EarthLoader text="화면을 불러오는 중..." />}>
            <Routes>
              <Route path="/" element={<OnBoarding />} />
              <Route path="/onboarding" element={<OnBoarding />} />
              <Route path="/onboarding2" element={<OnBoarding2 />} />
              <Route path="/onboarding3" element={<OnBoarding3 />} />

              <Route path="/landing" element={<Landing />} />
              <Route path="/Landing" element={<Landing />} />

              <Route path="/login" element={<Login />} />
              <Route path="/find-password" element={<FindPassword />} />
              <Route path="/verify-code" element={<VerifyCode />} />
              <Route path="/signup" element={<SignUp />} />
              <Route
                path="/oauth/:provider/callback"
                element={<OAuthCallback />}
              />

              <Route path="/home" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/recommend" element={<Recommend />} />
              <Route path="/total" element={<Total />} />
              <Route path="/mypage" element={<RequireAuth><MyPage /></RequireAuth>} />
              <Route path="/saved-places" element={<RequireAuth><SavedPlaces /></RequireAuth>} />
              <Route
                path="/mypage/recent-places"
                element={<RequireAuth><RecentPlacesPage /></RequireAuth>}
              />
              <Route path="/route-create" element={<RouteCreate />} />
              <Route path="/detail" element={<Detail />} />
              <Route path="/route-result" element={<RouteResult />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/popular-all" element={<PopularAll />} />
              <Route path="/my-schedule" element={<RequireAuth><MySchedule /></RequireAuth>} />

              {/* 일반 사용자 문의사항 페이지 */}
              <Route path="/inquiry" element={<RequireAuth><Inquiry /></RequireAuth>} />
              <Route path="/inquiry/write" element={<RequireAuth><InquiryWrite /></RequireAuth>} />
              <Route path="/inquiry/:id" element={<RequireAuth><InquiryDetail /></RequireAuth>} />

              {/* 관리자 메인 페이지 */}
              <Route path="/admin" element={<RequireAuth><AdminMain /></RequireAuth>} />

              {/* 관리자 문의 페이지 */}
              <Route path="/admin/inquiry" element={<RequireAuth><AdminInquiry /></RequireAuth>} />
              <Route
                path="/admin/inquiry/write"
                element={<RequireAuth><AdminInquiryWrite /></RequireAuth>}
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </div>
      </main>

      {shouldShowDefaultFooter && <Footer />}
      {shouldShowAdminFooter && <AdminFooter />}

      <SearchPop
        isOpen={isSearchPopOpen}
        onClose={() => setIsSearchPopOpen(false)}
      />
    </div>
  );
}

function App() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = (event) => {
      let savedTheme = null;
      try {
        savedTheme = localStorage.getItem("site-theme");
      } catch (error) {
        // 저장소 접근이 차단된 환경에서는 시스템 설정을 따른다.
      }

      if (savedTheme === "light" || savedTheme === "dark") return;

      const nextTheme = event.matches ? "dark" : "light";
      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.style.colorScheme = nextTheme;
    };

    media.addEventListener?.("change", syncSystemTheme);
    return () => media.removeEventListener?.("change", syncSystemTheme);
  }, []);

  return (
    <SavedPlacesProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </SavedPlacesProvider>
  );
}

export default App;
