import survivorLogo from "../../assets/logos/survivorLogo.jpeg";
import bigBrotherLogo from "../../assets/logos/bigBrotherLogo.jpg";
import dwtsLogo from "../../assets/logos/dwtsLogo.jpg";
import dragRaceLogo from "../../assets/logos/dragRaceLogo.jpg";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../redux/hooks";
import { showsSelectors } from "../../redux/slices/showsSlice";
import { useSelector } from "react-redux";
import UploadImage from "../UploadImage";


const Homepage = (props: { openAuthModal: (isLogin?: boolean) => void }) => {
  const navigate = useNavigate();
  const shows = useAppSelector(showsSelectors.selectAll);
  const user = useSelector((state: any) => state.user.value);

  return (
    <div className="page">
  
        <h1 className="text-4xl font-bold mb-6 text-gray-800">
          Welcome to Reality Ranking!
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Discover rankings, track eliminations, and engage with your favorite reality shows.
        </p>
      {!user && <div className="w-1/5 flex flex-col justify-between mx-auto gap-2">
        <button className="btn btn-primary" onClick={() => props.openAuthModal(true)}>Login</button>
        <button className="btn btn-secondary" onClick={() => props.openAuthModal(false)}>Create Account</button>
      </div>}
        <div className="shows-grid">
           <div className="show-card">
             <img src={survivorLogo} alt="Show 1" className="show-image" />
             <div className="middle"><h2 className="show-title text" onClick={()=>navigate("/ranking")}>Survivor</h2></div>
           </div>
            <div className="show-card">
              <img src={dwtsLogo} alt="Show 3" className="show-image" />
              <div className="middle"><h2 className="show-title text" onClick={()=>navigate("/ranking", {state: {show: shows.find((show) => show.name === "Dancing with the Stars")}})}>Dancing with the Stars</h2></div>
            </div>
            <div className="show-card">
              <img src={bigBrotherLogo} alt="Show 2" className="show-image" />
              <div className="middle"><h2 className="show-title text" onClick={()=>navigate("/ranking", {state: {show: shows.find((show) => show.name === "Big Brother")}})}>Big Brother</h2></div>
            </div>
            <div className="show-card">
              <img src={dragRaceLogo} alt="Show 2" className="show-image" />
              <div className="middle"><h2 className="show-title text" onClick={()=>navigate("/ranking", {state: {show: shows.find((show) => show.name === "RuPaul's Drag Race")}})}>RuPaul's Drag Race</h2></div>
            </div>
        </div>
    </div>
  );
};

export default Homepage;
