import React from "react";
import "./Benefits.css";
import safetripImg from "../../../assets/safetrip.png";
import fasttrip from "../../../assets/fastride.png";
import bestprice from "../../../assets/bestprice.png";

const benefitsData = [
  {
    image: safetripImg,
    title: "Safe Rides",
    desc: "Fully vetted drivers with background checks and real-time safety monitoring",
    imgPosition: "bottom",
    bg: "#f8fafc",
  },
  {
    image: fasttrip, // Driving/Dashboard
    title: "Fast Pickup",
    desc: "Average wait time under 5 minutes with live GPS tracking on every trip",
    imgPosition: "top",
    bg: "#f3f4fb",
  },
  {
    image: bestprice,
    title: "Best Prices",
    desc: "Transparent fares with zero surge pricing — what you see is what you pay",
    imgPosition: "bottom",
    bg: "#f0fdf4",
  },
  {
    image:
      "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&q=80&w=800", // Electric Charging
    title: "Eco-Friendly",
    desc: "Electric and hybrid vehicle options for sustainable, guilt-free travel",
    imgPosition: "top",
    bg: "#fdf8f6",
  },
];

export default function Benefits() {
  return (
    <section id="benefits" className="benefits-section-main">
      <div className="benefits-container-inner">
        <div className="section-header">
          <span className="section-badge">WHY PICKYOU</span>
          <h2 className="section-title">
            Built Around <span className="text-active">You</span>
          </h2>
          <p className="section-desc">
            Every feature designed for comfort, safety and speed
          </p>
        </div>

        <div className="benefits-grid">
          {benefitsData.map((benefit, i) => (
            <div
              key={i}
              className={`benefit-card-premium ${benefit.imgPosition === "top" ? "img-top" : "img-bottom"}`}
              style={{ backgroundColor: benefit.bg }}
            >
              <div className="benefit-card-content">
                <h3 className="benefit-card-title">{benefit.title}</h3>
                <p className="benefit-card-desc">{benefit.desc}</p>
              </div>
              <div className="benefit-card-image">
                <img src={benefit.image} alt={benefit.title} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
