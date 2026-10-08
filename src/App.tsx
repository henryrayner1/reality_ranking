import { lazy, Suspense, useEffect, useState } from "react";
import "./App.css";
import Homepage from "./components/Homepage/Homepage";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { checkUserLoggedIn, userLogout } from "./utils/util";
import { AccountTypes } from "./utils/Constants";
import { setUser } from "./redux/slices/userSlice";
import { useAppDispatch } from "./redux/hooks";
import Navbar from "./components/Navbar/Navbar";
import LoginModal from "./components/modals/LoginModal/LoginModal";
import LogoutConfirmModal from "./components/modals/LogoutConfirmModal/LogoutConfirmModal";
import PageLoading from "./components/PageLoading/PageLoading";

// Lazy-loaded so each page's code (and heavy deps like recharts/dnd-kit) is
// split into its own chunk and only downloaded when that route is visited,
// instead of one oversized bundle loaded up front on the homepage.
const Admin = lazy(() => import("./components/Admin/Admin/Admin"));
const RankingComponent2 = lazy(() => import("./components/RankingComponent/RankingComponent2"));
const Insights = lazy(() => import("./components/Insights/Insights/Insights"));

function App() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const user = useSelector((state: any) => state.user.value);
  const [loginDisplayFlag, setLoginDisplayFlag] = useState(false);
  const [initialIsLogin, setInitialIsLogin] = useState(true);
  const [logoutConfirmDisplayFlag, setLogoutConfirmDisplayFlag] = useState(false);

  const initializeData = async () => {
    if (checkUserLoggedIn() && !user) {
      const loggedInUser = checkUserLoggedIn();
      if (loggedInUser) {
        dispatch(setUser({ id: loggedInUser.id, email: loggedInUser.email, accountType: loggedInUser.accountType }) );
      }
    }
  };

  useEffect(() => {
    initializeData();
  }, []);

  const openAuthModal = (isLogin = true) => {
    setInitialIsLogin(isLogin);
    setLoginDisplayFlag(true);
  };

  const handleLogout = () => {
    userLogout();
    dispatch(setUser(null));
    setLogoutConfirmDisplayFlag(false);
    navigate("/");
  };

  const HomepageProps = {
    openAuthModal,
  };

  const isAdmin = user?.accountType === AccountTypes.ADMIN;

  return (<>
    <Navbar
      loggedIn={!!user}
      isAdmin={isAdmin}
      onLoginClick={() => openAuthModal(true)}
      onLogoutClick={() => setLogoutConfirmDisplayFlag(true)}
    />
    <Suspense fallback={<PageLoading />}>
      <Routes>
          <Route path="/" element={<Homepage {...HomepageProps} />} />
          <Route path="/admin" element={isAdmin ? <Admin /> : <Navigate to="/" replace />} />
          <Route path="/admin/:showSlug" element={isAdmin ? <Admin /> : <Navigate to="/" replace />} />
          <Route path="/admin/:showSlug/:seasonNumber" element={isAdmin ? <Admin /> : <Navigate to="/" replace />} />
          <Route path="/ranking" element={<RankingComponent2 />} />
          <Route path="/ranking/:showSlug" element={<RankingComponent2 />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/insights/:showSlug" element={<Insights />} />
          <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    {loginDisplayFlag && <LoginModal displayFlag={loginDisplayFlag} setDisplayFlag={setLoginDisplayFlag} initialIsLogin={initialIsLogin} />}
    {logoutConfirmDisplayFlag && (
      <LogoutConfirmModal
        displayFlag={logoutConfirmDisplayFlag}
        setDisplayFlag={setLogoutConfirmDisplayFlag}
        onConfirm={handleLogout}
      />
    )}
  </>);
}

export default App;
