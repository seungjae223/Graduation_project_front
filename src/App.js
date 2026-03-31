import "./App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Header from "./Header/Header";

import OnBoarding from "./OnBoarding/OnBoarding";
import OnBoarding2 from "./OnBoarding/OnBoarding2";
import OnBoarding3 from "./OnBoarding/OnBoarding3";
import Landing from "./Landingpage/Landing";
import Login from "./Login/Login";
import Footer from "./Footer/Footer";
import Home from "./Homepage/Home";
import Recommend from "./Recommend/Recommend";
import Total from "./Recommend/Total";
import MyPage from "./Mypage/MyPage";
import SavedPlaces from "./Mypage/SavedPlaces";
import Search from "./Search/Search";
import RouteCreate from "./RouteCreate/RouteCreate";
import Detail from "./Recommend/Detail";
import RouteResult from "./RouteResult/RouteResult";
import Schedule from "./Schedule/Schedule";
import PopularAll from "./Homepage/PopularAll";
import MySchedule from "./MySchedule/MySchedule";
import { SavedPlacesProvider } from "./Context/SavedPlacesContext";
import SignUp from "./Login/SignUp";

function Layout() {
  const location = useLocation();

  const hideFooterPaths = [
    "/",
    "/onboarding",
    "/onboarding2",
    "/onboarding3",
    "/login",
    "/Landing",
    "/detail",
  ];

  const shouldHideFooter = hideFooterPaths.includes(location.pathname);

  const hideHeaderPaths = ["/login"];
  const shouldHideHeader = hideHeaderPaths.includes(location.pathname);

  return (
    <div className="app">
      {!shouldHideHeader && <Header />}

      <main className={`app-content ${!shouldHideFooter ? "with-footer" : ""}`}>
        <Routes>
          <Route path="/" element={<OnBoarding />} />
          <Route path="/onboarding2" element={<OnBoarding2 />} />
          <Route path="/onboarding3" element={<OnBoarding3 />} />
          <Route path="/Landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/recommend" element={<Recommend />} />
          <Route path="/total" element={<Total />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/saved-places" element={<SavedPlaces />} />
          <Route path="/route-create" element={<RouteCreate />} />
          <Route path="/detail" element={<Detail />} />
          <Route path="/route-result" element={<RouteResult />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/popular-all" element={<PopularAll />} />
          <Route path="/my-schedule" element={<MySchedule />} />
          <Route path="/signup" element={<SignUp />} />
          
        </Routes>
      </main>

      {!shouldHideFooter && <Footer />}
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