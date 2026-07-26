import React from "react";
import { FaArrowRight } from "react-icons/fa";
import "./UnlimitedFreedom.css";
import freedomImg from "../../../assets/unlimitedfreedom.png";

const UnlimitedFreedom = () => {
    return (
        <section id="freedom" className="freedom-section-main">
            <div className="freedom-container-inner">
                <div className="freedom-grid">
                    <div className="freedom-content">
                        <span className="freedom-badge">
                            UNLIMITED FREEDOM
                        </span>
                        <h2 className="freedom-title">
                            Go Wherever,<br />
                            <span className="text-highlight">Whenever</span>
                        </h2>
                        <p className="freedom-desc">
                            Whether it's a midnight airport run, a quick office commute, or a weekend adventure — PickU is available 24/7 so you're never stranded.
                        </p>

                        {/* Service tiles on the left */}
                        <div className="freedom-tiles-grid">
                            {[
                                { emoji: "🏢", title: "Office Commute", sub: "Daily work rides", color: "#e0f2fe" },
                                { emoji: "✈️", title: "Airport Transfers", sub: "On-time, every time", color: "#dcfce7" },
                                { emoji: "🛍️", title: "Shopping Trips", sub: "Door-to-door ease", color: "#fef3c7" },
                                { emoji: "🌙", title: "Late Night Rides", sub: "Safe 24/7 service", color: "#ede9fe" },
                            ].map((tile, i) => (
                                <div key={i} className="freedom-service-tile">
                                    <span className="tile-emoji" style={{ "--tile-bg": tile.color, color: tile.color }}>
                                        {tile.emoji}
                                    </span>
                                    <div className="tile-info">
                                        <h4 className="tile-title">{tile.title}</h4>
                                        <p className="tile-sub">{tile.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => {
                                const el = document.getElementById('download');
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth' });
                                } else {
                                    window.location.href = '/#download';
                                }
                            }}
                            className="freedom-cta-btn"
                            style={{ border: 'none', cursor: 'pointer' }}
                        >
                            Book a Ride <FaArrowRight />
                        </button>
                    </div>

                    {/* Image on the right side */}
                    <div className="freedom-image-container">
                        <div className="image-glow" />
                        <img
                            src={freedomImg}
                            alt="Unlimited Freedom"
                            className="freedom-image"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default UnlimitedFreedom;
