import { Link, Outlet } from 'react-router-dom';
import './LandingLayout.css';

const LandingLayout = () => {
    return (
        <div className="landing-shell">
            <header className="landing-header">
                <div className="landing-logo">PickYou</div>
                <nav className="landing-nav">
                    <Link to="/">Home</Link>
                    <Link to="/about">About Us</Link>
                    <Link to="/contact">Contact Us</Link>
                    <Link to="/admin-portal/login" className="staff-login-link">
                        Staff Login
                    </Link>
                </nav>
            </header>

            <main className="landing-main">
                <Outlet />
            </main>

            <footer className="landing-footer">
                <p>&copy; {new Date().getFullYear()} PickYou. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LandingLayout;
