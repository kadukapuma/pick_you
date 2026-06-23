import React, { useEffect, useRef } from "react";
import "./RideTypes.css";
import bikeImg from "../../../assets/bike.png";
import threewheelImg from "../../../assets/threewheel.png";
import flexImg from "../../../assets/flex.png";
import minicarImg from "../../../assets/minicar.png";
import carImg from "../../../assets/car.png";
import minivanImg from "../../../assets/minivan.png";
const rideTypesData = [
  {
    name: "Bike",
    tag: "Solo & Fast",
    tagColor: "#fef3c7",
    tagText: "#b45309",
    price: "From $0.5",
    features: ["Perfect for solo travelers", "Quickest through heavy traffic"],
    examples: "Ex: Scooters, Motorbikes",
    bg: "#fffbeb",
    border: "#f59e0b",
    image: bikeImg,
  },
  {
    name: "Three Wheel",
    tag: "Most Affordable",
    tagColor: "#dcfce7",
    tagText: "#16a34a",
    price: "From $1",
    features: ["Budget-friendly", "Great for narrow streets"],
    examples: "Ex: Bajaj & TVS Three Wheelers",
    bg: "#f0fdf4",
    border: "#22c55e",
    image: threewheelImg,
  },
  {
    name: "Flex",
    tag: "Economical",
    tagColor: "#e0f2fe",
    tagText: "#0e5c6b",
    price: "From $3",
    features: ["Economical and efficient", "Budget-friendly"],
    examples: "Ex: Suzuki Alto, Tata Nano, Maruti Alto",
    bg: "#f0f9ff",
    border: "#0e5c6b",
    image: flexImg,
  },
  {
    name: "Minicar",
    tag: "Popular",
    tagColor: "#fef3c7",
    tagText: "#b45309",
    price: "From $5",
    features: ["Quick and convenient", "Perfect for small groups"],
    examples: "Ex: Wagon R, Celerio, Toyota Vitz",
    bg: "#fffbeb",
    border: "#f59e0b",
    image: minicarImg,
  },
  {
    name: "Car",
    tag: "Premium",
    tagColor: "#ede9fe",
    tagText: "#7c3aed",
    price: "From $9",
    features: ["Stylish and comfortable", "Ideal for longer trips"],
    examples: "Ex: Toyota Prius, Honda Fit, Allion",
    bg: "#faf5ff",
    border: "#8b5cf6",
    image: carImg,
  },
  {
    name: "Minivan",
    tag: "For Groups",
    tagColor: "#dcfce7",
    tagText: "#16a34a",
    price: "From $15",
    features: ["Spacious and reliable", "Great for families or big luggage"],
    examples: "Ex: Toyota KDH, Caravan, Nissan",
    bg: "#f0fdf4",
    border: "#22c55e",
    image: minivanImg,
  },
];

export default function RideTypes() {
  const scrollRef = useRef(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    // 1. Initialize scroll to the middle set for bidirectional infinite feel
    const oneSetWidth = scrollContainer.scrollWidth / 3;
    scrollContainer.scrollLeft = oneSetWidth;

    let animationId;
    let isPaused = false;

    const autoScroll = () => {
      if (!isPaused) {
        scrollContainer.scrollLeft += 1;
        // The onScroll handler below will handle the jump logic
      }
      animationId = requestAnimationFrame(autoScroll);
    };

    animationId = requestAnimationFrame(autoScroll);

    // 2. Handle the "Teleportation" logic for seamless scrolling
    const handleScroll = () => {
      const currentScroll = scrollContainer.scrollLeft;
      const oneSet = scrollContainer.scrollWidth / 3;

      if (currentScroll >= oneSet * 2) {
        // We've moved into the 3rd set, jump back to the 2nd set
        scrollContainer.scrollLeft = currentScroll - oneSet;
      } else if (currentScroll <= 0) {
        // We've moved before the 1st set, jump forward to the 2nd set
        scrollContainer.scrollLeft = currentScroll + oneSet;
      }
    };

    // 3. Mouse Drag Support (Desktop "Swipe")
    let isDragging = false;
    let startX;
    let scrollLeft;

    const handleMouseDown = (e) => {
      isDragging = true;
      isPaused = true;
      scrollContainer.classList.add("dragging");
      startX = e.pageX - scrollContainer.offsetLeft;
      scrollLeft = scrollContainer.scrollLeft;
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - scrollContainer.offsetLeft;
      const walk = (x - startX) * 2; // Scroll speed multiplier
      scrollContainer.scrollLeft = scrollLeft - walk;
    };

    const handleMouseUp = () => {
      isDragging = false;
      isPaused = false;
      scrollContainer.classList.remove("dragging");
    };

    const handleMouseEnter = () => (isPaused = true);
    const handleMouseLeave = () => (isPaused = false);
    const handleTouchStart = () => (isPaused = true);
    const handleTouchEnd = () => (isPaused = false);

    scrollContainer.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    scrollContainer.addEventListener("scroll", handleScroll);
    scrollContainer.addEventListener("mouseenter", handleMouseEnter);
    scrollContainer.addEventListener("mouseleave", handleMouseLeave);
    scrollContainer.addEventListener("touchstart", handleTouchStart);
    scrollContainer.addEventListener("touchend", handleTouchEnd);

    return () => {
      cancelAnimationFrame(animationId);
      scrollContainer.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      scrollContainer.removeEventListener("scroll", handleScroll);
      scrollContainer.removeEventListener("mouseenter", handleMouseEnter);
      scrollContainer.removeEventListener("mouseleave", handleMouseLeave);
      scrollContainer.removeEventListener("touchstart", handleTouchStart);
      scrollContainer.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return (
    <section id="ride-types" className="ride-types-container">
      <div className="section-header">
        <span className="section-badge">RIDE OPTIONS</span>
        <h2 className="section-title">
          Rides For Every <span className="text-highlight">Passenger</span>
        </h2>
        <p className="section-desc">
          Choose the vehicle that matches your budget and comfort — from quick
          budget rides to premium comfort
        </p>
      </div>

      <div className="ride-slider-wrapper" ref={scrollRef}>
        <div className="ride-track">
          {[...rideTypesData, ...rideTypesData, ...rideTypesData].map((ride, i) => (
            <div
              key={i}
              className="ride-card"
              style={{
                backgroundColor: ride.bg,
                borderColor: `${ride.border}25`,
              }}
            >
              <div className="ride-card-top">
                <div className="ride-info">
                  <h3 className="ride-name">{ride.name}</h3>
                  <span
                    className="ride-tag"
                    style={{
                      backgroundColor: ride.tagColor,
                      color: ride.tagText,
                    }}
                  >
                    {ride.tag}
                  </span>
                </div>
                <span className="ride-price">{ride.price}</span>
              </div>

              <ul className="ride-features">
                {ride.features.map((f, fi) => (
                  <li key={fi} className="feature-item">
                    <span className="feature-dot">•</span> {f}
                  </li>
                ))}
              </ul>

              <p className="ride-examples">{ride.examples}</p>

              <div className="ride-visual">
                {ride.image ? (
                  <img
                    src={ride.image}
                    alt={ride.name}
                    className="ride-image-custom"
                  />
                ) : (
                  <span className="ride-emoji">{ride.emoji}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
