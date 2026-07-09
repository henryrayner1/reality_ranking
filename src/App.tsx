import { StrictMode, useEffect, useState } from "react";
import "./App.css";
import Homepage from "./components/Homepage/Homepage";
import { Routes, Route, Navigate } from "react-router-dom";
import Admin from "./components/Admin/Admin";
import Layout from "./components/Layout";
import { useDispatch, useSelector } from "react-redux";
import { checkUserLoggedIn, getShows, getEpisodes, userLogout } from "./utils/util";
import { AccountTypes } from "./utils/Constants";
import { setUser } from "./redux/slices/userSlice";
import { fetchAllShows } from "./redux/thunks/showsThunks";
import { useAppDispatch } from "./redux/hooks";
import Navbar from "./components/Navbar";
import LoginModal from "./components/modals/LoginModal";
import LogoutConfirmModal from "./components/modals/LogoutConfirmModal";
import RankingComponent2 from "./components/RankingComponent/RankingComponent2";
import Insights from "./components/Insights/Insights";

function App() {
  const dispatch = useAppDispatch();

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

    dispatch(fetchAllShows());
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
    <Routes>
        <Route path="/" element={<Homepage {...HomepageProps} />} />
        <Route path="/admin" element={isAdmin ? <Admin /> : <Navigate to="/" replace />} />
        <Route path="/ranking" element={<RankingComponent2 />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
