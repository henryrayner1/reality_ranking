import { StrictMode, useEffect, useState } from "react";
import "./App.css";
import Homepage from "./components/Homepage/Homepage";
import { Routes, Route } from "react-router-dom";
import Admin from "./components/Admin/Admin";
import Layout from "./components/Layout";
import { useDispatch, useSelector } from "react-redux";
import { checkUserLoggedIn, getShows, getEpisodes } from "./utils/util";
import { setUser } from "./redux/slices/userSlice";
import { fetchAllShows } from "./redux/thunks/showsThunks";
import { useAppDispatch } from "./redux/hooks";
import Navbar from "./components/Navbar";
import LoginModal from "./components/modals/LoginModal";
import RankingComponent2 from "./components/RankingComponent/RankingComponent2";
import Insights from "./components/Insights/Insights";

function App() {
  const dispatch = useAppDispatch();

  const user = useSelector((state: any) => state.user.value);
  const [loginDisplayFlag, setLoginDisplayFlag] = useState(false);
  const [initialIsLogin, setInitialIsLogin] = useState(true);

  const initializeData = async () => {
    if (checkUserLoggedIn() && !user) {
      const loggedInUser = checkUserLoggedIn();
      if (loggedInUser) {
        dispatch(setUser({ id: loggedInUser.id, email: loggedInUser.email, isAdmin: loggedInUser.isAdmin }) );
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

  const HomepageProps = {
    openAuthModal,
  };

  return (<>
    <Navbar loggedIn={!!user} />
    <Routes>
        <Route path="/" element={<Homepage {...HomepageProps} />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/ranking" element={<RankingComponent2 />} />
        <Route path="/insights" element={<Insights />} />
    </Routes>
    {loginDisplayFlag && <LoginModal displayFlag={loginDisplayFlag} setDisplayFlag={setLoginDisplayFlag} initialIsLogin={initialIsLogin} />}
  </>);
}

export default App;
