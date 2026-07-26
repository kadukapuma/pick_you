import React, { useRef } from "react";
import Home from "../Home";
import AboutUs from "../AboutUs";
import RideTypes from "../RideTypes";
import Benefits from "../Benefits";
import UnlimitedFreedom from "../UnlimitedFreedom/UnlimitedFreedom";
import Download from "../Download";

const LandingPage = () => {
    return (
        <div className="landing-page-content">
            <div id="home" className="section-container">
                <Home />
            </div>

            <div id="about" className="section-container">
                <AboutUs />
            </div>

            <div id="benefits" className="section-container">
                <Benefits />
            </div>

            <div id="freedom" className="section-container">
                <UnlimitedFreedom />
            </div>

            <div id="ride-types" className="section-container">
                <RideTypes />
            </div>

            <div className="section-container">
                <Download />
            </div>
        </div>
    );
};

export default LandingPage;
