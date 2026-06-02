import "./App.css";
import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Header from "./Header/Header";
import Footer from "./Footer/Footer";
import SearchPop from "./SearchPopup/SearchPop";
import EarthLoader from "./Loading/EarthLoader";
import { SavedPlacesProvider } from "./Context/SavedPlacesContext";

// 관리자 전용 푸터
import AdminFooter from "./Admin/AdminFooter/AdminFooter";

// 페이지 레이지 로딩
const OnBoarding = lazy(() => import("./OnBoarding/OnBoarding"));
const OnBoarding2 = lazy(() => import("./OnBoarding/OnBoarding2"));
const OnBoarding3 = lazy(() => import("./OnBoarding/OnBoarding3"));
const Landing = lazy(() => import("./Landingpage/Landing"));

const Login = lazy(() => import("./Login/Login"));
const FindPassword = lazy(() => import("./Login/FindPassword"));
const VerifyCode = lazy(() => import("./Login/VerifyCode"));
const SignUp = lazy(() => import("./Login/SignUp"));

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

function Layout() {
  const location = useLocation();
  const [isSearchPopOpen, setIsSearchPopOpen] = useState(false);

  useEffect(() => {
    setIsSearchPopOpen(false);
  }, [location.pathname]);

  const pathname = location.pathname.toLowerCase();
  const isAdminPage = pathname.startsWith("/admin");

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
  const shouldShowDefaultFooter = !shouldHideFooter && !isAdminPage;
  const shouldShowAdminFooter = isAdminPage;

  // 로그인, 관리자 화면에서만 Header 숨김
  // 랜딩, 온보딩, 온보딩2, 온보딩3, 이메일 인증 관련 화면에서는 Header 보임
  const shouldHideHeader = hideHeaderPaths.includes(pathname) || isAdminPage;

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
        <div key={location.pathname} className="route-transition">
          <Suspense fallback={<EarthLoader text="Connecting..." />}>
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

              <Route path="/home" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/recommend" element={<Recommend />} />
              <Route path="/total" element={<Total />} />
              <Route path="/mypage" element={<MyPage />} />
              <Route path="/saved-places" element={<SavedPlaces />} />
              <Route
                path="/mypage/recent-places"
                element={<RecentPlacesPage />}
              />
              <Route path="/route-create" element={<RouteCreate />} />
              <Route path="/detail" element={<Detail />} />
              <Route path="/route-result" element={<RouteResult />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/popular-all" element={<PopularAll />} />
              <Route path="/my-schedule" element={<MySchedule />} />

              {/* 일반 사용자 문의사항 페이지 */}
              <Route path="/inquiry" element={<Inquiry />} />
              <Route path="/inquiry/write" element={<InquiryWrite />} />
              <Route path="/inquiry/:id" element={<InquiryDetail />} />

              {/* 관리자 메인 페이지 */}
              <Route path="/admin" element={<AdminMain />} />

              {/* 관리자 문의 페이지 */}
              <Route path="/admin/inquiry" element={<AdminInquiry />} />
              <Route
                path="/admin/inquiry/write"
                element={<AdminInquiryWrite />}
              />

              {/* 잘못된 경로로 들어오면 온보딩으로 표시 */}
              <Route path="*" element={<OnBoarding />} />
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
  return (
    <SavedPlacesProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </SavedPlacesProvider>
  );
}

export default App;