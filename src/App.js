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

function Layout() {
  const location = useLocation();

  const hideFooterPaths = [
    "/",
    "/onboarding",
    "/onboarding2",
    "/onboarding3",
    "/login",
    "/Landing",
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
          <Route path="/recommend" element={<Recommend />} />
          <Route path="/total" element={<Total />} />
          <Route path="/mypage" element={<MyPage />} />
        </Routes>
      </main>

      {!shouldHideFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;