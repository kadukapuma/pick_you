// Import React Router components for navigation
import { Link, Outlet } from "react-router-dom";

// Import CSS for styling
import "./LandingLayout.css";

// Import logo image
import logo from "../../../assets/logo.png";

// Main layout component for the landing pages
const LandingLayout = () => {
  return (
    <div className="landing-shell">
      {/* ---------------- HEADER AREA ---------------- */}
      <header className="landing-header">
        {/* Logo section */}
        <div className="landing-logo">
          <img src={logo} alt="PickYou Logo" className="logo-image" />
        </div>

        {/* Navigation menu */}
        <nav className="landing-nav">
          {/* Each Link navigates to a route */}
          <Link to="/">Home</Link>
          <Link to="/about">About Us</Link>
          <Link to="/contact">Contact Us</Link>
          {/* Special link styled differently for staff login */}
          <Link to="/admin-portal/login" className="staff-login-link">
            Staff Login
          </Link>
        </nav>
      </header>

      {/* ---------------- MAIN CONTENT AREA ---------------- */}
      <main className="landing-main">
        {/* Outlet renders the child route components (Home, AboutUs, ContactUs, etc.) */}
        <Outlet />
      </main>

      {/* ---------------- FOOTER AREA ---------------- */}
      <footer className="landing-footer">
        {/* Dynamic year so it updates automatically */}
        <p>&copy; {new Date().getFullYear()} PickYou. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingLayout;
