import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";
import { setUser } from "../redux/slices/userSlice";
import LoginModal from "./modals/LoginModal";
import { checkUserLoggedIn, userLogout } from "../utils/util";

export interface LayoutContext {
  loginDisplayFlag: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

const Layout = () => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [loginDisplayFlag, setLoginDisplayFlag] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: any) => state.user.value);

  useEffect(() => {
        if (checkUserLoggedIn() && !user) {
          const loggedInUser = checkUserLoggedIn();
          if (loggedInUser) {
            dispatch(setUser({ id: loggedInUser.id, email: loggedInUser.email, isAdmin: loggedInUser.isAdmin }) );
          }
        }
  },[]);

  useEffect(() => {
    setDropdownVisible(false);
  }, [loginDisplayFlag]);

  const navbar = (
    <div className="fixed top-0 left-0 w-full z-30">
      <div className="w-full h-[3.5rem] bg-gray-800 flex items-center px-4 relative">
        <h1 className="text-white text-2xl font-bold hover:cursor-pointer" onClick={() => navigate("/")}>Reality Ranking</h1>
        {user ? (
          <div className="absolute right-4 text-white flex gap-2 cursor-pointer">
            <div className="dropdown-container">
              <p onClick={() => setDropdownVisible(!dropdownVisible)}>
                My Account
              </p>
              <div
                className={`dropdown-content ${
                  dropdownVisible ? "block" : "hidden"
                }`}
              >
                <p className="dropdown-item" onClick={() => {setDropdownVisible(false); navigate("/ranking")}}>
                  Rankings
                </p>
                {user.isAdmin && <p className="dropdown-item" onClick={() => {setDropdownVisible(false); navigate("/admin")}}>
                  Admin
                </p>}

                <p>{user.email}</p>
                <p
                  className="underline dropdown-item text-right"
                  onClick={() => {
                    dispatch(setUser(null))
                    userLogout();
                    setDropdownVisible(false);
                    navigate("/");}
                  }
                >
                  Logout
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="absolute right-4 text-white cursor-pointer"
            onClick={() => setLoginDisplayFlag(true)}
          >
            Login
          </div>
        )}
      </div>
    </div>
  );
  return (
    <div className="absolute left-0 top-0 w-full">
      {navbar}
      <Outlet
        context={{
          loginDisplayFlag,
          openLoginModal: () => setLoginDisplayFlag(true),
          closeLoginModal: () => setLoginDisplayFlag(false),
        }}
      />
      {loginDisplayFlag && <LoginModal displayFlag={loginDisplayFlag} setDisplayFlag={setLoginDisplayFlag} />}
    </div>
  );
};
export default Layout;
