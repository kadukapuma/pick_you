import React from "react";
import { Link } from "react-router-dom";
import "../Download/Download.css"; // Reuse general download styles
import "./DriverDownload.css"; // Driver-specific overrides
import {
  FaStar,
  FaWallet,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaApple,
  FaGooglePlay,
} from "react-icons/fa";
import driverAppImg from "../../../assets/driverapp.png";
import appStore from "../../../assets/appleicon.png";
import googlePlay from "../../../assets/playstore.png";

const driverSteps = [
  {
    num: "01",
    title: "Download the Driver App",
    desc: "Available for Android and iOS — start your journey today.",
  },
  {
    num: "02",
    title: "Upload Documents",
    desc: "Submit your license and vehicle info for quick verification.",
  },
  {
    num: "03",
    title: "Start Earning",
    desc: "Go online whenever you want and accept ride requests!",
  },
];

export default function DriverDownload() {
  return (
    <section className="download-section-main driver-download-theme">
      <div className="download-container-inner">
        <div className="download-text-side">
          <span className="download-badge">GET STARTED</span>
          <h2 className="download-title">
            Download the <br />
            <span className="text-highlight">Driver App</span>
          </h2>
          <p className="download-subtitle">
            Take control of your schedule, maximize your earnings, and join our
            community of professional drivers.
          </p>

          <div className="download-steps-list">
            {driverSteps.map((step, i) => (
              <div key={i} className="download-step-item">
                <div className="step-number-box">{step.num}</div>
                <div className="step-content">
                  <p className="step-title">{step.title}</p>
                  <p className="step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="download-store-btns">
            <button className="app-btn">
              <img src={appStore} alt="App Store" className="store-img" />

              <div className="store-text">
                <small className="store-subtitle">Download on the</small>
                <strong>App Store</strong>
              </div>
            </button>
            <button className="app-btn">
              <img src={googlePlay} alt="Google Play" className="store-img" />

              <div className="store-text">
                <small className="store-subtitle">Get it on</small>
                <strong>Google Play</strong>
              </div>
            </button>
          </div>

          <div className="cross-app-cta enhanced">
            <div className="cta-content">
              <h4 className="cta-heading">Need a ride instead?</h4>
              <p className="cta-text">Get there faster with our seamless passenger experience.</p>
            </div>
            <Link to="/#download" className="cta-link-btn primary">
              Get Passenger App →
            </Link>
          </div>
        </div>

        <div className="download-visual-side">
          <div className="driver-app-mockup-container">
            <img
              src={driverAppImg}
              alt="Driver App Mockup"
              className="driver-app-mockup-img"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
