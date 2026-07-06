import { useSelector } from "react-redux";

const Navbar = (props) => {

    const user = useSelector((state: any) => state.user.value);

    return(
        <nav className="navbar navbar-expand-md navbar-dark bg-dark">
            <div className="container-fluid">
                <a className="navbar-brand font-bold" href="/">Reality Ranking</a>
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#mainNavbar"
                    aria-controls="mainNavbar"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse" id="mainNavbar">
                    <ul className="navbar-nav me-auto mb-2 mb-md-0">
                        {props.loggedIn && <li className="nav-item">
                            <a className="nav-link" href="/admin">Admin</a>
                        </li>}
                        {props.loggedIn && <li className="nav-item">
                            <a className="nav-link" href="/ranking">My Rankings</a>
                        </li>}
                        <li className="nav-item">
                            <a className="nav-link" href="/insights">Insights</a>
                        </li>
                    </ul>
                    <ul className="navbar-nav ms-auto mb-2 mb-md-0">
                        <li className="nav-item">
                            {props.loggedIn ? <a className="nav-link" href="#">Logout</a> : <a className="nav-link" href="#">Login</a>}
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    )
}

export default Navbar;