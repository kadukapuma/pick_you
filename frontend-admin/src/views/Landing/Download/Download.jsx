import React from "react";
import { Link } from "react-router-dom";
import "./Download.css";
import { FaStar, FaWallet, FaCheckCircle, FaMapMarkerAlt } from "react-icons/fa";
import passengerAppImg from "../../../assets/photo-removebg-preview.png";
import appStore from "../../../assets/appleicon.png";
import googlePlay from "../../../assets/playstore.png";

const downloadSteps = [
  {
    num: "01",
    title: "Download the App",
    desc: "Available on iOS App Store and Google Play — free to download.",
  },
  {
    num: "02",
    title: "Create Your Account",
    desc: "Sign up with your phone number in under 60 seconds.",
  },
  {
    num: "03",
    title: "Book Your First Ride",
    desc: "Enter your destination, pick your ride type, and you're on your way!",
  },
];

export default function Download() {
  return (
    <section id="download" className="download-section-main">
      <div className="download-container-inner">
        <div className="download-text-side">
          <span className="download-badge">GET STARTED</span>
          <h2 className="download-title">
            Download the <br />
            <span className="text-highlight">PickU App</span>
          </h2>
          <p className="download-subtitle">
            Book rides, track your driver in real-time, and pay seamlessly — all
            from your pocket.
          </p>

          <div className="download-steps-list">
            {downloadSteps.map((step, i) => (
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
                <small className="store-subtitletext">Download on the</small>
                <strong>App Store</strong>
              </div>
            </button>
            <button className="app-btn">
              <img src={googlePlay} alt="Google Play" className="store-img" />
              <div className="store-text">
                <small className="store-subtitletext">Get it on</small>
                <strong>Google Play</strong>
              </div>
            </button>
          </div>

          <div className="cross-app-cta enhanced">
            <div className="cta-content">
              <h4 className="cta-heading">Want to earn while you drive?</h4>
              <p className="cta-text">Join our partner network and transform your commute into profit.</p>
            </div>
            <Link to="/for-drivers#driver-download" className="cta-link-btn primary">
              Get the Driver App →
            </Link>
          </div>
        </div>

        <div className="download-visual-side">
          <div className="passenger-app-mockup-container">
            <img
              src={passengerAppImg}
              alt="Passenger App Mockup"
              className="passenger-app-mockup-img"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
