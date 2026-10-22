import "./App.css";
import "./animations/onboardingButtonMotion.css";
import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import PageTransition, { RouteContentReady } from "./animations/PageTransition";
import { cancelOnboardingTransition, syncOnboardingTransitionRoute } from "./OnBoarding/onboardingTransition";
import {
  BrowserRouter,
  Link,
  Navigate,
  Routes,
  Route,
  useLocation,
  useNavigationType,
} from "react-router-dom";

import Header from "./Header/Header";
import Footer from "./Footer/Footer";
import { DetailFooterProvider } from "./components/DetailFooterContext";
import SearchPop from "./SearchPopup/SearchPop";
import EarthLoader from "./Loading/EarthLoader";
import RouteErrorBoundary from "./Loading/RouteErrorBoundary";
import useSessionKey from "./utils/useSessionKey";
import { SavedPlacesProvider } from "./Context/SavedPlacesContext";
import { getAccessToken } from "./api/api";
import { buildLoginPath } from "./utils/authRedirect";
import OnBoarding from "./OnBoarding/OnBoarding";
import OnBoarding2 from "./OnBoarding/OnBoarding2";
import OnBoarding3 from "./OnBoarding/OnBoarding3";
import AdminAccessGuard from "./Admin/AdminAccessGuard";
import useKeyboardRouteFocus from "./utils/useKeyboardRouteFocus";
import getRouteBoundaryKey from "./utils/routeBoundaryKey";
import getMainTabTransition from "./utils/mainTabTransition";
import getSubpageTransition from "./utils/subpageTransition";

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
const DestinationExplore = lazy(() => import("./Destinations/DestinationExplore"));
const Recommend = lazy(() => import("./Recommend/Recommend"));
const Total = lazy(() => import("./Recommend/Total"));
const Detail = lazy(() => import("./Recommend/Detail"));
const ReviewWrite = lazy(() => import("./Recommend/ReviewWrite"));
const PopularAll = lazy(() => import("./Homepage/PopularAll"));

const MyPage = lazy(() => import("./Mypage/MyPage"));
const MyReviews = lazy(() => import("./Mypage/MyReviews"));
const PastTrips = lazy(() => import("./Mypage/PastTrips"));
const MyProfile = lazy(() => import("./Mypage/MyProfile"));
const MyPasswordChange = lazy(() => import("./Mypage/MyPasswordChange"));
const SavedPlaces = lazy(() => import("./Mypage/SavedPlaces"));
const RecentPlacesPage = lazy(() =>
  import("./RecentPlacesPage/RecentPlacesPage")
);
const MySchedule = lazy(() => import("./MySchedule/MySchedule"));

const TripDatePage = lazy(() => import("./RouteCreate/TripDatePage"));
const TripRegionSelect = lazy(() => import("./RouteCreate/TripRegionSelect"));
// V16.4 read-only itinerary detail; preserve legacy RouteResult source for later map migration.
const TripDetailPage = lazy(() => import("./RouteResult/TripDetailPage"));
const TripOptimizationPage = lazy(() => import("./RouteResult/TripOptimizationPage"));
const TripEditPage = lazy(() => import("./RouteResult/TripEditPage"));
const TripPlacePickerPage = lazy(() => import("./RouteResult/TripPlacePickerPage"));
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
  useSessionKey();
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
  useSessionKey();
  const location = useLocation();
  const [isSearchPopOpen, setIsSearchPopOpen] = useState(false);
  const navigationType = useNavigationType();
  useKeyboardRouteFocus(location.pathname, navigationType);
  const previousPathRef = useRef(null);
  const previousSearchRef = useRef("");
  useLayoutEffect(() => { syncOnboardingTransitionRoute(location.pathname); }, [location.pathname, location.key]);
  useEffect(() => () => cancelOnboardingTransition(), []);

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
    previousSearchRef.current = location.search;
  }, [pathname, location.search]);

  const hideFooterPaths = [
    "/",
    "/onboarding",
    "/onboarding2",
    "/onboarding3",
    "/login",
    "/find-password",
    "/verify-code",
    "/landing",
    "/signup",
    "/detail/review",
  ];

  const hideHeaderPaths = ["/login"];

  const shouldHideFooter = hideFooterPaths.includes(pathname);
  const shouldShowDefaultFooter =
    !shouldHideFooter && !isAdminPage && !isOAuthCallbackPage;
  const isDetailRoute = pathname === "/detail";
  // Hold the transition direction for the lifetime of a history entry.
  // Async reads, tab state or closing a popup must not cancel the slide mid-flight.
  const { mainTabTransition, detailTransition, subpageTransition } = useMemo(() => {
    const previousRoute = previousPathRef.current;
    const tab = getMainTabTransition(previousRoute, pathname);
    return {
      mainTabTransition: tab,
      subpageTransition: tab ? "" : getSubpageTransition(
        previousRoute, pathname, previousSearchRef.current, location.search),
      detailTransition: isDetailRoute && previousRoute && previousRoute !== "/detail"
        ? "route-transition--detail-forward"
        : !isDetailRoute && previousRoute === "/detail"
          ? "route-transition--detail-backward" : "",
    };
  }, [location, pathname, isDetailRoute]);
  // Only folderId identifies another full saved-places view. Search/filters do not.
  const transitionKey = pathname === "/saved-places"
    ? `${pathname}:${new URLSearchParams(location.search).get("folderId") || "list"}`
    : pathname;
  const shouldShowAdminFooter = isAdminPage && hasAccessToken;

  // 로그인, 관리자 화면에서만 Header 숨김
  // 랜딩, 온보딩, 온보딩2, 온보딩3, 이메일 인증 관련 화면에서는 Header 보임
  const shouldHideHeader =
    hideHeaderPaths.includes(pathname) || isAdminPage || isOAuthCallbackPage;

  return (
    <div className="app" data-page={pathname}>
      {!shouldHideHeader && (
        <Header onSearchClick={() => setIsSearchPopOpen(true)} />
      )}

      <main
        className={`app-content ${
          shouldShowDefaultFooter || shouldShowAdminFooter ? "with-footer" : ""
        }`}
      >
        <PageTransition
          key={transitionKey}
          className={`route-transition ${detailTransition} ${mainTabTransition} ${subpageTransition} ${
            pathname === "/" || pathname.startsWith("/onboarding")
              ? `onboarding-route onboarding-route--${onboardingDirection}`
              : ""
          }`}
        >
          <RouteErrorBoundary key={getRouteBoundaryKey(location.pathname, location.search)}>
          <Suspense fallback={<EarthLoader variant="page" text="화면을 불러오는 중..." />}>
            <RouteContentReady>
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
              <Route path="/destinations/:code" element={<DestinationExplore />} />
              <Route path="/recommend" element={<Recommend />} />
              <Route path="/total" element={<Total />} />
              <Route path="/mypage" element={<RequireAuth><MyPage /></RequireAuth>} />
              <Route path="/mypage/reviews" element={<RequireAuth><MyReviews /></RequireAuth>} />
              <Route path="/mypage/past-trips" element={<RequireAuth><PastTrips /></RequireAuth>} />
              <Route path="/mypage/profile" element={<RequireAuth><MyProfile /></RequireAuth>} />
              <Route path="/mypage/password" element={<RequireAuth><MyPasswordChange /></RequireAuth>} />
              <Route path="/saved-places" element={<RequireAuth><SavedPlaces /></RequireAuth>} />
              <Route
                path="/mypage/recent-places"
                element={<RequireAuth><RecentPlacesPage /></RequireAuth>}
              />
              <Route path="/route-create" element={<RequireAuth><TripDatePage /></RequireAuth>} />
              <Route path="/route-create/region" element={<RequireAuth><TripRegionSelect /></RequireAuth>} />
              <Route path="/detail" element={<Detail />} />
              <Route path="/detail/review" element={<ReviewWrite />} />
              <Route path="/route-result" element={<RequireAuth><TripDetailPage /></RequireAuth>} />
              <Route path="/route-optimize" element={<RequireAuth><TripOptimizationPage /></RequireAuth>} />
              <Route path="/route-edit" element={<RequireAuth><TripEditPage /></RequireAuth>} />
              <Route path="/route-add-places" element={<RequireAuth><TripPlacePickerPage /></RequireAuth>} />
              <Route path="/schedule" element={<RequireAuth><Schedule /></RequireAuth>} />
              <Route path="/popular-all" element={<PopularAll />} />
              <Route path="/my-schedule" element={<RequireAuth><MySchedule /></RequireAuth>} />

              {/* 일반 사용자 문의사항 페이지 */}
              <Route path="/inquiry" element={<RequireAuth><Inquiry /></RequireAuth>} />
              <Route path="/inquiry/write" element={<RequireAuth><InquiryWrite /></RequireAuth>} />
              <Route path="/inquiry/:id" element={<RequireAuth><InquiryDetail /></RequireAuth>} />

              {/* 관리자 메인 페이지 */}
              <Route path="/admin" element={<RequireAuth><AdminAccessGuard><AdminMain /></AdminAccessGuard></RequireAuth>} />

              {/* 관리자 문의 페이지 */}
              <Route path="/admin/inquiry" element={<RequireAuth><AdminAccessGuard><AdminInquiry /></AdminAccessGuard></RequireAuth>} />
              <Route
                path="/admin/inquiry/write"
                element={<RequireAuth><AdminAccessGuard><AdminInquiryWrite /></AdminAccessGuard></RequireAuth>}
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
            </RouteContentReady>
          </Suspense>
          </RouteErrorBoundary>
        </PageTransition>
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
  return (
    <SavedPlacesProvider>
      <BrowserRouter>
        <DetailFooterProvider><Layout /></DetailFooterProvider>
      </BrowserRouter>
    </SavedPlacesProvider>
  );
}

export default App;
