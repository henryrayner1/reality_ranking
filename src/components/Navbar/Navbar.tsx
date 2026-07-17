import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { NavLink, Link, useLocation } from "react-router-dom";
// Import from the exact same bundle file main.tsx already loads for side effects
// (not the bare "bootstrap" specifier, which resolves to bootstrap.esm.js — a
// second, independent copy of Bootstrap's JS with its own document-level click
// listeners, causing every toggler click to double-fire and always net "open").
import Bootstrap from "bootstrap/dist/js/bootstrap.bundle.min.js";
const { Collapse } = Bootstrap;
import "./Navbar.css";

const Navbar = (props) => {

    const user = useSelector((state: any) => state.user.value);
    const navRef = useRef<HTMLElement>(null);
    const location = useLocation();

    // Navbar sits above <Routes>, so it can't read the active route's
    // :showSlug via useParams — pull it straight out of the URL instead, so
    // switching between Admin/My Rankings/Insights carries the show you're
    // currently looking at along with you rather than bouncing back to
    // whichever show happens to be first in the list.
    const currentShowSlug = location.pathname.match(/^\/(?:ranking|insights|admin)\/([^/]+)/)?.[1];
    const rankingPath = currentShowSlug ? `/ranking/${currentShowSlug}` : "/ranking";
    const insightsPath = currentShowSlug ? `/insights/${currentShowSlug}` : "/insights";
    const adminPath = currentShowSlug ? `/admin/${currentShowSlug}` : "/admin";

    // On mobile the menu is a Bootstrap .collapse toggled via data-bs-toggle;
    // clicking a NavLink navigates but doesn't collapse it back down on its own.
    const collapseMobileMenu = () => {
        const collapseEl = document.getElementById("mainNavbar");
        if (collapseEl) Collapse.getOrCreateInstance(collapseEl, { toggle: false }).hide();
    };

    // Exposed as a CSS var so other sticky elements (e.g. .page-header) can
    // sit flush beneath the navbar regardless of its actual rendered height,
    // which varies across breakpoints and when the mobile menu expands/collapses.
    // ResizeObserver (rather than a window resize listener) catches that
    // collapse/expand transition too, since it doesn't change viewport size.
    useEffect(() => {
        if (!navRef.current) return;
        const setNavHeight = (height: number) => {
            document.documentElement.style.setProperty('--navbar-height', `${height}px`);
        };
        setNavHeight(navRef.current.offsetHeight);
        const observer = new ResizeObserver(([entry]) => setNavHeight(entry.target.clientHeight));
        observer.observe(navRef.current);
        return () => observer.disconnect();
    }, []);

    return(
        <nav ref={navRef} className="navbar navbar-expand-md navbar-dark bg-dark app-navbar">
            <div className="container-fluid">
                <Link className="navbar-brand font-bold" to="/" onClick={collapseMobileMenu}>Reality Ranking</Link>
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
                        {props.isAdmin && <li className="nav-item">
                            <NavLink className="nav-link" to={adminPath} onClick={collapseMobileMenu}>Admin</NavLink>
                        </li>}
                        {props.loggedIn && <li className="nav-item">
                            <NavLink className="nav-link" to={rankingPath} onClick={collapseMobileMenu}>My Rankings</NavLink>
                        </li>}
                        <li className="nav-item">
                            <NavLink className="nav-link" to={insightsPath} onClick={collapseMobileMenu}>Insights</NavLink>
                        </li>
                    </ul>
                    <ul className="navbar-nav ms-auto mb-2 mb-md-0 align-items-md-center">
                        {props.loggedIn && user?.email && (
                            <li className="nav-item">
                                <span className="navbar-text">{user.email}</span>
                            </li>
                        )}
                        <li className="nav-item">
                            {props.loggedIn
                                ? <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); props.onLogoutClick(); }}>Logout</a>
                                : <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); props.onLoginClick(); }}>Login</a>
                            }
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    )
}

export default Navbar;
