import { useEffect, useRef, useState, useCallback } from "react";
import {
  FaRocket, FaInfoCircle, FaShieldAlt, FaBolt, FaTag, FaLeaf,
  FaMapMarkerAlt, FaUserCheck, FaFlagCheckered, FaApple,
  FaGooglePlay, FaUsers, FaCity, FaStar, FaHeadset, FaCar,
} from "react-icons/fa";
import "./Home.css";

/* ─────────────────────────────────────
   Animated Counter
───────────────────────────────────── */
const Counter = ({ target, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const numeric = parseInt(target.replace(/\D/g, ""), 10);
        const steps = 60;
        const increment = numeric / steps;
        let current = 0;
        const timer = setInterval(() => {
          current += increment;
          if (current >= numeric) { setCount(numeric); clearInterval(timer); }
          else setCount(Math.floor(current));
        }, 1800 / steps);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

/* ─────────────────────────────────────
   Scroll Reveal
───────────────────────────────────── */
const Reveal = ({ children, delay = 0, className = "" }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.15 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${visible ? "revealed" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

/* ─────────────────────────────────────
   MAP ROUTE CONSTANTS
   A winding city route as SVG path points
───────────────────────────────────── */
const ROUTE_POINTS = [
  { x: 80,  y: 310 },  // 0  start – pickup
  { x: 80,  y: 220 },  // 1
  { x: 160, y: 220 },  // 2  turn
  { x: 160, y: 150 },  // 3
  { x: 290, y: 150 },  // 4  turn
  { x: 290, y: 230 },  // 5
  { x: 370, y: 230 },  // 6  turn
  { x: 370, y: 130 },  // 7
  { x: 500, y: 130 },  // 8  turn
  { x: 500, y: 240 },  // 9
  { x: 580, y: 240 },  // 10 end – dropoff
];

/* Build a flat SVG polyline string */
const routePolyline = ROUTE_POINTS.map(p => `${p.x},${p.y}`).join(" ");

/* Total route length (segment by segment) */
function segLengths(pts) {
  const lengths = [];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    lengths.push(Math.sqrt(dx * dx + dy * dy));
  }
  return lengths;
}
const SEG_LENGTHS = segLengths(ROUTE_POINTS);
const TOTAL_LENGTH = SEG_LENGTHS.reduce((a, b) => a + b, 0);

/* Get (x,y) + heading angle at a progress 0..1 along the route */
function posAtProgress(progress) {
  const target = progress * TOTAL_LENGTH;
  let accumulated = 0;
  for (let i = 0; i < SEG_LENGTHS.length; i++) {
    const seg = SEG_LENGTHS[i];
    if (accumulated + seg >= target || i === SEG_LENGTHS.length - 1) {
      const t = (target - accumulated) / seg;
      const p0 = ROUTE_POINTS[i];
      const p1 = ROUTE_POINTS[i + 1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      return { x: p0.x + dx * t, y: p0.y + dy * t, angle };
    }
    accumulated += seg;
  }
  const last = ROUTE_POINTS[ROUTE_POINTS.length - 1];
  return { x: last.x, y: last.y, angle: 0 };
}

/* ─────────────────────────────────────
   MAP SCENE (SVG)
   Renders city blocks, road grid, route,
   animated car, pickup/dropoff pins
───────────────────────────────────── */
const MapScene = ({ progress }) => {
  const { x, y, angle } = posAtProgress(Math.min(Math.max(progress, 0), 1));

  /* Stroke-dashoffset to reveal route as car moves */
  const routeReveal = progress * TOTAL_LENGTH;

  /* Pulse rings on pins */
  const showPickupPulse = progress < 0.05;
  const showDropoffPulse = progress > 0.95;

  return (
    <svg
      className="map-svg"
      viewBox="0 0 660 400"
      preserveAspectRatio="xMidYMid meet"
      aria-label="Animated city map showing taxi route"
    >
      <defs>
        {/* Travelled route gradient */}
        <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="100%" stopColor="#ff6b00" />
        </linearGradient>

        {/* Car glow filter */}
        <filter id="carGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>

        {/* Shadow filter */}
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(0,0,0,0.25)" />
        </filter>

        {/* Clip */}
        <clipPath id="mapClip">
          <rect x="0" y="0" width="660" height="400" rx="24" />
        </clipPath>

        {/* Pin gradient */}
        <linearGradient id="pinGreen" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22d55a" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
        <linearGradient id="pinRed" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>

      <g clipPath="url(#mapClip)">

        {/* ── MAP BACKGROUND ── */}
        <rect width="660" height="400" fill="#e8f0e9" />

        {/* ── CITY BLOCKS ── */}
        {[
          [20, 20, 100, 80],   [140, 20, 90, 80],  [250, 20, 100, 80],
          [370, 20, 90, 80],   [480, 20, 100, 80],  [600, 20, 50, 80],
          [20, 120, 100, 80],  [190, 120, 60, 80],  [310, 120, 30, 80],  [360, 80, 80, 30],
          [430, 80, 30, 80],   [480, 80, 30, 20],   [530, 80, 110, 30],
          [20, 260, 30, 80],   [70, 260, 60, 80],   [150, 260, 60, 80],
          [250, 280, 100, 60], [380, 270, 80, 70],  [490, 270, 140, 70],
          [20, 360, 110, 30],  [160, 360, 80, 30],  [270, 360, 120, 30],
          [420, 360, 80, 30],  [530, 360, 110, 30],
        ].map(([bx, by, bw, bh], i) => (
          <rect key={i} x={bx} y={by} width={bw} height={bh}
            rx="3" fill={i % 3 === 0 ? "#d0d8d1" : i % 3 === 1 ? "#c8d4cb" : "#cdd8ce"}
            stroke="#b8c8ba" strokeWidth="0.5"
          />
        ))}

        {/* ── BUILDING WINDOWS (decorative) ── */}
        {[
          [30,30],[50,30],[30,50],[50,50],[30,70],[50,70],
          [150,30],[170,30],[150,50],[170,50],
          [260,30],[280,30],[300,30],[260,50],[280,50],
          [490,30],[510,30],[530,30],[490,50],[510,50],
        ].map(([wx, wy], i) => (
          <rect key={i} x={wx} y={wy} width="10" height="8" rx="1"
            fill="rgba(255,255,255,0.55)" />
        ))}

        {/* ── ROAD GRID (background roads – grey) ── */}
        {/* Horizontal roads */}
        {[110, 205, 340, 430].map((ry, i) => (
          <g key={i}>
            <rect x="0" y={ry - 14} width="660" height="28" fill="#b0bec5" />
            {/* dashes */}
            {[...Array(22)].map((_, d) => (
              <rect key={d} x={d * 30} y={ry - 1} width="16" height="2"
                fill="rgba(255,255,255,0.35)" />
            ))}
          </g>
        ))}
        {/* Vertical roads */}
        {[120, 230, 350, 460].map((rx, i) => (
          <g key={i}>
            <rect x={rx - 14} y="0" width="28" height="400" fill="#b0bec5" />
            {[...Array(14)].map((_, d) => (
              <rect key={d} x={rx - 1} y={d * 30} width="2" height="16"
                fill="rgba(255,255,255,0.35)" />
            ))}
          </g>
        ))}

        {/* ── ROUTE ROADS (slightly brighter to emphasize route path) ── */}
        <polyline points={routePolyline}
          fill="none" stroke="#90a4ae" strokeWidth="26"
          strokeLinejoin="round" strokeLinecap="round"
        />
        <polyline points={routePolyline}
          fill="none" stroke="#b0bec5" strokeWidth="24"
          strokeLinejoin="round" strokeLinecap="round"
        />
        {/* Centre-line dashes */}
        <polyline points={routePolyline}
          fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"
          strokeDasharray="10 12"
          strokeLinejoin="round" strokeLinecap="round"
        />

        {/* ── TRAVELLED ROUTE HIGHLIGHT ── */}
        <polyline points={routePolyline}
          fill="none"
          stroke="url(#routeGrad)"
          strokeWidth="5"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={TOTAL_LENGTH}
          strokeDashoffset={TOTAL_LENGTH - routeReveal}
          style={{ transition: "stroke-dashoffset 0.05s linear" }}
        />

        {/* ── PICKUP PIN ── */}
        <g transform={`translate(${ROUTE_POINTS[0].x}, ${ROUTE_POINTS[0].y - 28})`}>
          {showPickupPulse && <>
            <circle cx="0" cy="14" r="20" fill="rgba(34,213,90,0.15)" className="pin-pulse" />
            <circle cx="0" cy="14" r="30" fill="rgba(34,213,90,0.08)" className="pin-pulse-2" />
          </>}
          <g filter="url(#softShadow)">
            <path d="M0,0 A12,12 0 0,1 12,12 L0,28 L-12,12 A12,12 0 0,1 0,0Z"
              fill="url(#pinGreen)" />
            <circle cx="0" cy="11" r="5" fill="white" opacity="0.9" />
          </g>
          <text x="14" y="4" fill="#16a34a" fontSize="10" fontWeight="700"
            fontFamily="system-ui,sans-serif">Pickup</text>
        </g>

        {/* ── DROPOFF PIN ── */}
        <g transform={`translate(${ROUTE_POINTS[ROUTE_POINTS.length - 1].x}, ${ROUTE_POINTS[ROUTE_POINTS.length - 1].y - 28})`}>
          {showDropoffPulse && <>
            <circle cx="0" cy="14" r="20" fill="rgba(248,113,113,0.2)" className="pin-pulse" />
            <circle cx="0" cy="14" r="30" fill="rgba(248,113,113,0.1)" className="pin-pulse-2" />
          </>}
          <g filter="url(#softShadow)" opacity={progress > 0.6 ? 1 : 0.35}
            style={{ transition: "opacity 0.4s ease" }}>
            <path d="M0,0 A12,12 0 0,1 12,12 L0,28 L-12,12 A12,12 0 0,1 0,0Z"
              fill="url(#pinRed)" />
            <circle cx="0" cy="11" r="5" fill="white" opacity="0.9" />
          </g>
          <text x="14" y="4" fill="#dc2626" fontSize="10" fontWeight="700"
            fontFamily="system-ui,sans-serif"
            opacity={progress > 0.6 ? 1 : 0.35}
            style={{ transition: "opacity 0.4s ease" }}>Dropoff</text>
        </g>

        {/* ── CAR SHADOW ── */}
        <ellipse
          cx={x} cy={y + 8}
          rx="14" ry="5"
          fill="rgba(0,0,0,0.18)"
          style={{ filter: "blur(3px)" }}
          transform={`rotate(${angle}, ${x}, ${y + 8})`}
        />

        {/* ── ANIMATED CAR ── */}
        <g transform={`translate(${x}, ${y}) rotate(${angle})`}
          filter="url(#carGlow)">
          {/* Car body */}
          <rect x="-14" y="-9" width="28" height="18" rx="4" fill="#ffd700" />
          {/* Roof */}
          <rect x="-8" y="-14" width="16" height="8" rx="3" fill="#ffed4a" />
          {/* TAXI text */}
          <rect x="-8" y="-14" width="16" height="8" rx="2" fill="#1a1f2b" opacity="0.7" />
          <text x="0" y="-7.5" textAnchor="middle" fill="#ffd700"
            fontSize="5" fontWeight="800" fontFamily="system-ui,sans-serif"
            letterSpacing="0.5">TAXI</text>
          {/* Windscreen */}
          <rect x="5" y="-7" width="7" height="7" rx="1" fill="rgba(180,220,255,0.8)" />
          <rect x="-12" y="-7" width="7" height="7" rx="1" fill="rgba(180,220,255,0.8)" />
          {/* Headlights */}
          <circle cx="14" cy="-5" r="2.5" fill="#fff9c4" />
          <circle cx="14" cy="5" r="2.5" fill="#fff9c4" />
          {/* Tail lights */}
          <circle cx="-14" cy="-5" r="2" fill="#ff4444" />
          <circle cx="-14" cy="5" r="2" fill="#ff4444" />
          {/* Wheels */}
          <ellipse cx="-8" cy="-9" rx="3" ry="2" fill="#333" />
          <ellipse cx="8" cy="-9" rx="3" ry="2" fill="#333" />
          <ellipse cx="-8" cy="9" rx="3" ry="2" fill="#333" />
          <ellipse cx="8" cy="9" rx="3" ry="2" fill="#333" />
        </g>

        {/* ── MAP LABEL OVERLAYS ── */}
        <g opacity="0.6">
          <text x="33" y="68" fill="#546e7a" fontSize="8"
            fontFamily="system-ui,sans-serif" fontWeight="600">DOWNTOWN</text>
          <text x="255" y="68" fill="#546e7a" fontSize="8"
            fontFamily="system-ui,sans-serif" fontWeight="600">MIDTOWN</text>
          <text x="488" y="68" fill="#546e7a" fontSize="8"
            fontFamily="system-ui,sans-serif" fontWeight="600">UPTOWN</text>
          <text x="155" y="305" fill="#546e7a" fontSize="8"
            fontFamily="system-ui,sans-serif" fontWeight="600">EAST SIDE</text>
          <text x="390" y="310" fill="#546e7a" fontSize="8"
            fontFamily="system-ui,sans-serif" fontWeight="600">WEST END</text>
        </g>

        {/* ── MAP BORDER / VIGNETTE ── */}
        <rect x="0" y="0" width="660" height="400" rx="24"
          fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="2" />

        {/* ── PROGRESS BADGE ── */}
        <g transform="translate(530, 20)">
          <rect x="0" y="0" width="110" height="36" rx="18"
            fill="rgba(26,31,43,0.82)" />
          <text x="55" y="11" textAnchor="middle" fill="rgba(255,255,255,0.6)"
            fontSize="9" fontFamily="system-ui,sans-serif" fontWeight="600"
            letterSpacing="0.5">ROUTE PROGRESS</text>
          <text x="55" y="27" textAnchor="middle" fill="#ffd700"
            fontSize="13" fontFamily="system-ui,sans-serif" fontWeight="800">
            {Math.round(progress * 100)}%
          </text>
        </g>

      </g>
    </svg>
  );
};

/* ─────────────────────────────────────
   MAIN HOME COMPONENT
───────────────────────────────────── */
const Home = () => {
  const heroRef = useRef(null);
  const mapSectionRef = useRef(null);
  const [mapProgress, setMapProgress] = useState(0);

  /* Drive the car with scroll inside the sticky map section */
  const handleScroll = useCallback(() => {
    const section = mapSectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const sectionH = section.offsetHeight;
    const viewH = window.innerHeight;
    /* progress 0 → 1 as sticky section scrolls through */
    const scrolled = -rect.top;
    const scrollRange = sectionH - viewH;
    const p = scrollRange > 0 ? Math.min(Math.max(scrolled / scrollRange, 0), 1) : 0;
    setMapProgress(p);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  /* Mouse tilt on hero */
  const handleMouseMove = (e) => {
    const hero = heroRef.current;
    if (!hero) return;
    const { left, top, width, height } = hero.getBoundingClientRect();
    const x = ((e.clientX - left) / width - 0.5) * 20;
    const y = ((e.clientY - top) / height - 0.5) * -10;
    hero.style.setProperty("--tilt-x", `${y}deg`);
    hero.style.setProperty("--tilt-y", `${x}deg`);
  };
  const handleMouseLeave = () => {
    const hero = heroRef.current;
    if (hero) {
      hero.style.setProperty("--tilt-x", "0deg");
      hero.style.setProperty("--tilt-y", "0deg");
    }
  };

  return (
    <div className="home-container">

      {/* ══════════ HERO ══════════ */}
      <section className="hero-section" ref={heroRef}
        onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <div className="hero-overlay" />
        <div className="road-lines">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="road-line" style={{ "--i": i }} />
          ))}
        </div>

        <div className="hero-content">
          <Reveal className="hero-text-wrap">
            <div className="hero-text">
              <span className="hero-eyebrow"><FaCar /> Next-Gen Ride Sharing</span>
              <h1>
                The Smarter Way to{" "}
                <span className="highlight">
                  Move
                  <svg className="underline-svg" viewBox="0 0 200 12" preserveAspectRatio="none">
                    <path d="M0,8 Q50,0 100,6 Q150,12 200,4"
                      stroke="#ffd700" strokeWidth="3" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
              <p>Welcome to <strong>PickYou</strong>. Reliable, safe, and affordable
                transportation — engineered for the modern city.</p>
              <div className="hero-btns">
                <button className="primary-btn"><FaRocket /> Book a Ride</button>
                <button className="secondary-btn"><FaInfoCircle /> Learn More</button>
              </div>
              <div className="hero-trust-row">
                <div className="trust-pill"><FaStar className="star-icon" /> 4.9 Rating</div>
                <div className="trust-pill"><FaUsers /> 50K+ Riders</div>
                <div className="trust-pill"><FaHeadset /> 24/7 Support</div>
              </div>
            </div>
          </Reveal>

          {/* Static car scene in hero */}
          <div className="hero-visual">
            <div className="scene-3d">
              <div className="road-track"><div className="lane-dash" /></div>
              <img
                src="https://cdn-icons-png.flaticon.com/512/744/744465.png"
                alt="Ride" className="floating-car"
              />
              <div className="car-shadow" />
              <div className="speed-lines">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="speed-line" style={{ "--si": i }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="hero-wave">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#f8fafc" />
          </svg>
        </div>
      </section>

      {/* ══════════ MAP ROUTE SECTION ══════════ */}
      <section className="map-route-section" ref={mapSectionRef}>
        <div className="map-sticky-container">

          {/* Left side text panels that fade in/out by progress */}
          <div className="map-text-column">

            {/* Panel 1 – always visible at start */}
            <div className="map-panel" style={{
              opacity: mapProgress < 0.3 ? 1 : Math.max(0, 1 - (mapProgress - 0.3) * 5),
              transform: `translateY(${mapProgress < 0.3 ? 0 : (mapProgress - 0.3) * -80}px)`,
              pointerEvents: mapProgress < 0.35 ? "auto" : "none",
            }}>
              <div className="map-panel-tag">Step 1</div>
              <h2>Request Your Ride</h2>
              <p>Open the app, drop your pin. Our system instantly scans for the
                nearest available drivers in your area.</p>
              <div className="map-panel-detail">
                <FaMapMarkerAlt className="mpd-icon green" />
                <span>Pickup confirmed at your location</span>
              </div>
            </div>

            {/* Panel 2 – visible mid-route */}
            <div className="map-panel" style={{
              opacity: mapProgress > 0.25 && mapProgress < 0.75
                ? Math.min((mapProgress - 0.25) * 8, 1) * Math.min((0.75 - mapProgress) * 8, 1)
                : 0,
              transform: `translateY(${mapProgress < 0.5 ? (0.5 - mapProgress) * 60 : (mapProgress - 0.5) * -60}px)`,
              position: "absolute",
              pointerEvents: mapProgress > 0.25 && mapProgress < 0.75 ? "auto" : "none",
            }}>
              <div className="map-panel-tag" style={{ background: "rgba(255,107,0,0.15)", color: "#ff6b00", borderColor: "rgba(255,107,0,0.3)" }}>
                Step 2
              </div>
              <h2>Track Live</h2>
              <p>Watch your taxi navigate city streets in real-time. Every turn,
                every block — live on your screen.</p>
              <div className="map-panel-detail">
                <FaCar className="mpd-icon orange" />
                <span>ETA updates every 5 seconds</span>
              </div>
            </div>

            {/* Panel 3 – visible near end */}
            <div className="map-panel" style={{
              opacity: mapProgress > 0.65 ? Math.min((mapProgress - 0.65) * 6, 1) : 0,
              transform: `translateY(${mapProgress > 0.65 ? 0 : (0.65 - mapProgress) * 80}px)`,
              position: "absolute",
              pointerEvents: mapProgress > 0.65 ? "auto" : "none",
            }}>
              <div className="map-panel-tag" style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626", borderColor: "rgba(220,38,38,0.25)" }}>
                Step 3
              </div>
              <h2>You've Arrived</h2>
              <p>Reach your destination safely. Rate your trip, tip your driver,
                and you're done — all in one tap.</p>
              <div className="map-panel-detail">
                <FaFlagCheckered className="mpd-icon red" />
                <span>Dropoff at destination</span>
              </div>
            </div>
          </div>

          {/* Map visual */}
          <div className="map-canvas-column">
            <div className="map-3d-wrapper">
              <MapScene progress={mapProgress} />
            </div>
            <div className="map-scroll-hint" style={{
              opacity: mapProgress < 0.05 ? 1 : 0,
              transition: "opacity 0.4s",
            }}>
              <span>Scroll to drive</span>
              <div className="scroll-arrow-anim" />
            </div>
          </div>

        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section className="features-section">
        <Reveal>
          <span className="section-eyebrow">Why PickYou</span>
          <h2>Built Around <span className="highlight">You</span></h2>
          <p className="section-subtitle">Every feature designed for comfort, safety and speed</p>
        </Reveal>
        <div className="features-grid">
          {[
            { icon: <FaShieldAlt />, color: "#667eea", title: "Safe Rides", desc: "Fully vetted drivers with background checks and real-time safety monitoring", delay: 0 },
            { icon: <FaBolt />, color: "#f59e0b", title: "Fast Pickup", desc: "Average wait time under 5 minutes with live GPS tracking on every trip", delay: 100 },
            { icon: <FaTag />, color: "#08d612", title: "Best Prices", desc: "Transparent fares with zero surge pricing — what you see is what you pay", delay: 200 },
            { icon: <FaLeaf />, color: "#10b981", title: "Eco-Friendly", desc: "Electric and hybrid vehicle options for sustainable, guilt-free travel", delay: 300 },
          ].map(f => (
            <Reveal key={f.title} delay={f.delay}>
              <div className="feature-card">
                <div className="feature-icon-wrap" style={{ "--accent": f.color }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <div className="card-glow" style={{ "--accent": f.color }} />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section className="how-it-works">
        <Reveal>
          <span className="section-eyebrow">The Process</span>
          <h2>Ride in <span className="highlight">3 Steps</span></h2>
          <p className="section-subtitle">From request to destination in minutes</p>
        </Reveal>
        <div className="steps-container">
          {[
            { n: "01", icon: <FaMapMarkerAlt />, title: "Request", desc: "Enter your pickup and drop-off location", delay: 0 },
            { n: "02", icon: <FaUserCheck />, title: "Match", desc: "Instantly paired with a nearby verified driver", delay: 150 },
            { n: "03", icon: <FaFlagCheckered />, title: "Arrive", desc: "Track your ride live and reach your destination safely", delay: 300 },
          ].map((s, i, arr) => (
            <div key={s.n} className="step-row-item">
              <Reveal delay={s.delay}>
                <div className="step">
                  <div className="step-number">{s.n}</div>
                  <div className="step-icon-wrap">{s.icon}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </Reveal>
              {i < arr.length - 1 && (
                <div className="step-connector">
                  <div className="connector-line" />
                  <div className="connector-dot" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ APP SECTION ══════════ */}
      <section className="app-section">
        <div className="app-bg-blobs">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
        </div>
        <div className="app-content">
          <Reveal className="app-text">
            <div>
              <span className="section-eyebrow light">Mobile App</span>
              <h2>Download the <span className="highlight">PickYou App</span></h2>
              <p>Book rides, track your driver in real-time, and pay seamlessly —
                all from your pocket.</p>
              <div className="app-buttons">
                <button className="app-btn">
                  <FaApple className="app-btn-icon" />
                  <span><small>Download on the</small>App Store</span>
                </button>
                <button className="app-btn">
                  <FaGooglePlay className="app-btn-icon" />
                  <span><small>Get it on</small>Google Play</span>
                </button>
              </div>
            </div>
          </Reveal>
          <Reveal delay={200} className="app-phone-wrap">
            <div className="phone-3d">
              <div className="phone-screen">
                <div className="phone-status-bar" />
                <div className="phone-map-placeholder">
                  <FaMapMarkerAlt className="map-pin" />
                  <div className="map-pulse" />
                  <FaCar className="map-car" />
                </div>
                <div className="phone-bottom-sheet">
                  <div className="sheet-handle" />
                  <p>Driver arriving in</p>
                  <strong>2 min</strong>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════ STATS ══════════ */}
      <section className="stats-section">
        {[
          { icon: <FaUsers />, target: "50000", suffix: "+", label: "Happy Riders" },
          { icon: <FaCity />, target: "100", suffix: "+", label: "Cities" },
          { icon: <FaStar />, target: "49", suffix: "/5", label: "Avg Rating" },
          { icon: <FaHeadset />, target: null, label: "Support", fixed: "24/7" },
        ].map((s, i) => (
          <Reveal key={s.label} delay={i * 100}>
            <div className="stat-item">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-number">
                {s.fixed ? s.fixed : <Counter target={s.target} suffix={s.suffix} />}
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          </Reveal>
        ))}
      </section>

    </div>
  );
};

export default Home;