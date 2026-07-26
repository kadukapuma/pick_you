import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  FaRocket,
  FaInfoCircle,
  FaShieldAlt,
  FaBolt,
  FaTag,
  FaLeaf,
  FaMapMarkerAlt,
  FaUserCheck,
  FaFlagCheckered,
  FaApple,
  FaGooglePlay,
  FaUsers,
  FaCity,
  FaStar,
  FaHeadset,
  FaCar,
  FaThumbsUp,
  FaClock,
  FaArrowRight,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import "./Home.css";
import carguybanner1 from "../../../assets/carguybanner1.png";
import homebanner2 from "../../../assets/homebanner2.png"
import bannerimage3 from "../../../assets/banner3.png"

/* ─────────────────────────────────────
   Animated Counter
───────────────────────────────────── */
const Counter = ({ target, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const numeric = parseInt(target.replace(/\D/g, ""), 10);
          const steps = 60;
          const increment = numeric / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= numeric) {
              setCount(numeric);
              clearInterval(timer);
            } else setCount(Math.floor(current));
          }, 1800 / steps);
        }
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

/* ─────────────────────────────────────
   Scroll Reveal
───────────────────────────────────── */
const Reveal = ({ children, delay = 0, className = "" }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "revealed" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

/* ─────────────────────────────────────
   ISOMETRIC MAP CONSTANTS
───────────────────────────────────── */
const ROUTE_POINTS = [
  { x: 90, y: 340 },
  { x: 90, y: 230 },
  { x: 180, y: 230 },
  { x: 180, y: 145 },
  { x: 310, y: 145 },
  { x: 310, y: 240 },
  { x: 400, y: 240 },
  { x: 400, y: 125 },
  { x: 530, y: 125 },
  { x: 530, y: 250 },
  { x: 620, y: 250 },
];

const routePolyline = ROUTE_POINTS.map((p) => `${p.x},${p.y}`).join(" ");

function segLengths(pts) {
  return pts.slice(1).map((p, i) => {
    const dx = p.x - pts[i].x;
    const dy = p.y - pts[i].y;
    return Math.sqrt(dx * dx + dy * dy);
  });
}
const SEG_LENGTHS = segLengths(ROUTE_POINTS);
const TOTAL_LENGTH = SEG_LENGTHS.reduce((a, b) => a + b, 0);

function posAtProgress(progress) {
  const target = Math.min(progress, 0.9999) * TOTAL_LENGTH;
  let accumulated = 0;
  for (let i = 0; i < SEG_LENGTHS.length; i++) {
    const seg = SEG_LENGTHS[i];
    if (accumulated + seg >= target || i === SEG_LENGTHS.length - 1) {
      const t = (target - accumulated) / seg;
      const p0 = ROUTE_POINTS[i];
      const p1 = ROUTE_POINTS[i + 1] || ROUTE_POINTS[i];
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
   3D CAR COMPONENT
───────────────────────────────────── */
const Car3D = ({ x, y, angle }) => {
  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${angle})`}
      style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.45))" }}
    >
      <ellipse
        cx="0"
        cy="13"
        rx="22"
        ry="7"
        fill="rgba(0,0,0,0.22)"
        style={{ filter: "blur(5px)" }}
      />
      <rect x="-22" y="-8" width="44" height="22" rx="5" fill="#c9a800" />
      <rect x="-22" y="-12" width="44" height="22" rx="5" fill="#FFD700" />
      <rect
        x="-18"
        y="-11"
        width="36"
        height="7"
        rx="3"
        fill="rgba(255,255,255,0.22)"
      />
      <line
        x1="-22"
        y1="-2"
        x2="22"
        y2="-2"
        stroke="rgba(0,0,0,0.12)"
        strokeWidth="1"
      />
      <rect x="-12" y="-22" width="24" height="13" rx="4" fill="#1a1f2b" />
      <rect
        x="-10"
        y="-21"
        width="20"
        height="4"
        rx="2"
        fill="rgba(255,255,255,0.18)"
      />
      <rect x="-10" y="-22" width="20" height="9" rx="2" fill="#1a1f2b" />
      <text
        x="0"
        y="-15.5"
        textAnchor="middle"
        fill="#FFD700"
        fontSize="5.5"
        fontWeight="800"
        fontFamily="system-ui,sans-serif"
        letterSpacing="0.8"
      >
        TAXI
      </text>
      <rect
        x="8"
        y="-11"
        width="11"
        height="10"
        rx="2"
        fill="rgba(180,230,255,0.85)"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="0.5"
      />
      <rect
        x="-19"
        y="-11"
        width="9"
        height="10"
        rx="2"
        fill="rgba(150,200,240,0.6)"
        stroke="rgba(0,0,0,0.1)"
        strokeWidth="0.5"
      />
      <ellipse cx="22" cy="-6" rx="3" ry="2.5" fill="#FFFDE7" />
      <ellipse cx="22" cy="4" rx="3" ry="2.5" fill="#FFFDE7" />
      <ellipse cx="24" cy="-6" rx="4" ry="3" fill="rgba(255,253,200,0.4)" />
      <ellipse cx="24" cy="4" rx="4" ry="3" fill="rgba(255,253,200,0.4)" />
      <ellipse cx="-22" cy="-6" rx="2.5" ry="2" fill="#FF4444" />
      <ellipse cx="-22" cy="4" rx="2.5" ry="2" fill="#FF4444" />
      {[
        [-10, -12],
        [10, -12],
        [-10, 12],
        [10, 12],
      ].map(([wx, wy], i) => (
        <g key={i}>
          <ellipse cx={wx} cy={wy} rx="5" ry="3.5" fill="#222" />
          <ellipse cx={wx} cy={wy} rx="2.5" ry="1.8" fill="#555" />
          <ellipse cx={wx} cy={wy} rx="1" ry="0.7" fill="#888" />
        </g>
      ))}
      <rect x="-5" y="-4" width="10" height="2" rx="1" fill="rgba(0,0,0,0.2)" />
      {[-5, -1, 3].map((oy, i) => (
        <line
          key={i}
          x1="-22"
          y1={oy}
          x2={-30 - i * 6}
          y2={oy}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={1.5 - i * 0.3}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
};

/* ─────────────────────────────────────
   MAP SCENE (SVG)
───────────────────────────────────── */
const MapScene = ({ progress }) => {
  const { x, y, angle } = posAtProgress(Math.min(Math.max(progress, 0), 1));
  const routeReveal = progress * TOTAL_LENGTH;
  const showPickupPulse = progress < 0.06;
  const showDropoffPulse = progress > 0.93;

  return (
    <svg
      className="map-svg"
      viewBox="0 0 720 420"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d55a" />
          <stop offset="100%" stopColor="#06b20f" />
        </linearGradient>
        <clipPath id="mapClip">
          <rect x="0" y="0" width="720" height="420" rx="20" />
        </clipPath>
        <linearGradient id="pinGreen" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22d55a" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
        <linearGradient id="pinRed" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <linearGradient id="blockGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c8dac2" />
          <stop offset="100%" stopColor="#b5cdb0" />
        </linearGradient>
        <linearGradient id="parkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#86c97a" />
          <stop offset="100%" stopColor="#6bb860" />
        </linearGradient>
        <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7ecbe8" />
          <stop offset="100%" stopColor="#5bb8d9" />
        </linearGradient>
      </defs>
      <g clipPath="url(#mapClip)">
        <rect width="720" height="420" fill="#d4e8cd" />
        <ellipse
          cx="660"
          cy="380"
          rx="80"
          ry="55"
          fill="url(#waterGrad)"
          opacity="0.6"
        />
        <ellipse
          cx="660"
          cy="380"
          rx="60"
          ry="38"
          fill="#6dc5e0"
          opacity="0.4"
        />
        <rect
          x="18"
          y="18"
          width="58"
          height="58"
          rx="6"
          fill="url(#parkGrad)"
          opacity="0.9"
        />
        {[
          [32, 32],
          [52, 32],
          [32, 52],
          [52, 52],
          [42, 42],
        ].map(([tx, ty], i) => (
          <circle key={i} cx={tx} cy={ty} r="7" fill="#4a9e3f" opacity="0.75" />
        ))}
        <rect
          x="20"
          y="20"
          width="54"
          height="54"
          rx="5"
          fill="none"
          stroke="#3f8a35"
          strokeWidth="0.8"
          opacity="0.6"
        />
        {[
          [95, 20, 88, 65],
          [200, 20, 72, 65],
          [290, 20, 98, 65],
          [406, 20, 75, 65],
          [500, 20, 85, 65],
          [604, 20, 98, 65],
          [18, 105, 48, 72],
          [210, 105, 80, 78],
          [340, 105, 34, 24],
          [390, 105, 70, 45],
          [480, 105, 28, 68],
          [520, 105, 60, 40],
          [600, 105, 105, 68],
          [18, 272, 42, 68],
          [78, 272, 52, 68],
          [152, 272, 58, 68],
          [260, 290, 90, 52],
          [390, 278, 76, 62],
          [498, 278, 80, 62],
          [598, 278, 104, 62],
          [18, 370, 105, 38],
          [152, 370, 72, 38],
          [260, 370, 110, 38],
          [410, 370, 85, 38],
          [516, 370, 88, 38],
        ].map(([bx, by, bw, bh], i) => (
          <g key={i}>
            <rect
              x={bx + 3}
              y={by + 3}
              width={bw}
              height={bh}
              rx="4"
              fill="rgba(0,0,0,0.08)"
            />
            <rect
              x={bx}
              y={by}
              width={bw}
              height={bh}
              rx="4"
              fill={
                i % 4 === 0
                  ? "#c2d8bc"
                  : i % 4 === 1
                    ? "#bdd3b8"
                    : i % 4 === 2
                      ? "#c8ddc3"
                      : "#b8ceb3"
              }
              stroke="#9abb96"
              strokeWidth="0.6"
            />
            <rect
              x={bx + 2}
              y={by + 2}
              width={bw - 4}
              height={bh * 0.28}
              rx="3"
              fill="rgba(255,255,255,0.18)"
            />
          </g>
        ))}
        {[
          [100, 28],
          [116, 28],
          [100, 44],
          [116, 44],
          [100, 60],
          [116, 60],
          [205, 28],
          [220, 28],
          [205, 44],
          [220, 44],
          [295, 28],
          [311, 28],
          [327, 28],
          [295, 44],
          [311, 44],
          [505, 28],
          [521, 28],
          [537, 28],
          [505, 44],
          [521, 44],
          [608, 28],
          [624, 28],
          [640, 28],
          [608, 44],
          [624, 44],
          [608, 60],
          [624, 60],
          [215, 112],
          [230, 112],
          [215, 128],
          [230, 128],
          [215, 144],
          [230, 144],
        ].map(([wx, wy], i) => (
          <rect
            key={i}
            x={wx}
            y={wy}
            width="11"
            height="9"
            rx="1.5"
            fill="rgba(255,255,255,0.5)"
            stroke="rgba(0,0,0,0.05)"
            strokeWidth="0.3"
          />
        ))}
        {[96, 198, 264, 358, 462].map((ry, i) => (
          <g key={`hr-${i}`}>
            <rect x="0" y={ry - 16} width="720" height="32" fill="#a8b8a3" />
            <rect x="0" y={ry - 15} width="720" height="30" fill="#b4c5af" />
            {[...Array(24)].map((_, d) => (
              <rect
                key={d}
                x={d * 32}
                y={ry - 1}
                width="18"
                height="2.5"
                rx="1"
                fill="rgba(255,255,255,0.4)"
              />
            ))}
          </g>
        ))}
        {[80, 165, 298, 390, 516].map((rx, i) => (
          <g key={`vr-${i}`}>
            <rect x={rx - 16} y="0" width="32" height="420" fill="#a8b8a3" />
            <rect x={rx - 15} y="0" width="30" height="420" fill="#b4c5af" />
            {[...Array(14)].map((_, d) => (
              <rect
                key={d}
                x={rx - 1}
                y={d * 32}
                width="2.5"
                height="18"
                rx="1"
                fill="rgba(255,255,255,0.4)"
              />
            ))}
          </g>
        ))}
        <polyline
          points={routePolyline}
          fill="none"
          stroke="#8ca887"
          strokeWidth="34"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={routePolyline}
          fill="none"
          stroke="#9db898"
          strokeWidth="30"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={routePolyline}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="28"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="0 1000000"
        />
        <polyline
          points={routePolyline}
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="2"
          strokeDasharray="14 10"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={routePolyline}
          fill="none"
          stroke="url(#routeGrad)"
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={TOTAL_LENGTH}
          strokeDashoffset={TOTAL_LENGTH - routeReveal}
          style={{ transition: "stroke-dashoffset 0.04s linear" }}
        />
        <g
          transform={`translate(${ROUTE_POINTS[0].x}, ${ROUTE_POINTS[0].y - 34})`}
        >
          {showPickupPulse && (
            <>
              <circle
                cx="0"
                cy="17"
                r="22"
                fill="rgba(34,213,90,0.15)"
                className="pin-pulse"
              />
              <circle
                cx="0"
                cy="17"
                r="34"
                fill="rgba(34,213,90,0.07)"
                className="pin-pulse-2"
              />
            </>
          )}
          <g style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.3))" }}>
            <path
              d="M0,0 A14,14 0 0,1 14,14 L0,32 L-14,14 A14,14 0 0,1 0,0Z"
              fill="url(#pinGreen)"
            />
            <circle cx="0" cy="13" r="6" fill="white" opacity="0.92" />
          </g>
          <rect
            x="16"
            y="-4"
            width="52"
            height="20"
            rx="10"
            fill="rgba(22,163,74,0.9)"
          />
          <text
            x="42"
            y="9.5"
            textAnchor="middle"
            fill="white"
            fontSize="9"
            fontWeight="700"
            fontFamily="system-ui,sans-serif"
          >
            PICKUP
          </text>
        </g>
        <g
          transform={`translate(${ROUTE_POINTS[ROUTE_POINTS.length - 1].x}, ${ROUTE_POINTS[ROUTE_POINTS.length - 1].y - 34})`}
        >
          {showDropoffPulse && (
            <>
              <circle
                cx="0"
                cy="17"
                r="22"
                fill="rgba(248,113,113,0.2)"
                className="pin-pulse"
              />
              <circle
                cx="0"
                cy="17"
                r="34"
                fill="rgba(248,113,113,0.1)"
                className="pin-pulse-2"
              />
            </>
          )}
          <g
            style={{
              filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.3))",
              opacity: progress > 0.65 ? 1 : 0.3,
              transition: "opacity 0.4s ease",
            }}
          >
            <path
              d="M0,0 A14,14 0 0,1 14,14 L0,32 L-14,14 A14,14 0 0,1 0,0Z"
              fill="url(#pinRed)"
            />
            <circle cx="0" cy="13" r="6" fill="white" opacity="0.92" />
          </g>
          <rect
            x="-68"
            y="-4"
            width="58"
            height="20"
            rx="10"
            fill="rgba(220,38,38,0.9)"
            opacity={progress > 0.65 ? 1 : 0.3}
            style={{ transition: "opacity 0.4s ease" }}
          />
          <text
            x="-39"
            y="9.5"
            textAnchor="middle"
            fill="white"
            fontSize="9"
            fontWeight="700"
            fontFamily="system-ui,sans-serif"
            opacity={progress > 0.65 ? 1 : 0.3}
            style={{ transition: "opacity 0.4s ease" }}
          >
            DROPOFF
          </text>
        </g>
        <Car3D x={x} y={y} angle={angle} />
        <g opacity="0.55">
          {[
            [102, 62, "PARK DIST."],
            [202, 62, "CENTRAL"],
            [508, 62, "UPTOWN"],
            [608, 62, "EAST BLVD"],
            [165, 315, "RIVERSIDE"],
            [398, 320, "WEST END"],
          ].map(([lx, ly, label], i) => (
            <text
              key={i}
              x={lx}
              y={ly}
              fill="#3a5c36"
              fontSize="8.5"
              fontFamily="system-ui,sans-serif"
              fontWeight="700"
              letterSpacing="0.06em"
            >
              {label}
            </text>
          ))}
        </g>
        <g transform="translate(596, 16)">
          <rect
            x="0"
            y="0"
            width="108"
            height="40"
            rx="20"
            fill="rgba(20,28,16,0.82)"
          />
          <text
            x="54"
            y="13"
            textAnchor="middle"
            fill="rgba(255,255,255,0.55)"
            fontSize="8.5"
            fontFamily="system-ui,sans-serif"
            fontWeight="700"
            letterSpacing="0.06em"
          >
            ROUTE
          </text>
          <text
            x="54"
            y="30"
            textAnchor="middle"
            fill="#22d55a"
            fontSize="14"
            fontFamily="system-ui,sans-serif"
            fontWeight="800"
          >
            {Math.round(progress * 100)}%
          </text>
        </g>
        <rect
          x="0"
          y="0"
          width="720"
          height="420"
          rx="20"
          fill="none"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
};

/* ─────────────────────────────────────
   HERO SLIDER DATA
───────────────────────────────────── */
const heroSlides = [
  {
    img: bannerimage3,
    headline: "Welcome to PickU",
    sub: "The smarter way to move — safe, affordable rides at your fingertips.",
    cta: "Book a Ride",
    ctaHref: "#benefits",
  },
  {
    img: homebanner2,
    headline: "Go Wherever, Whenever,",
    sub: "Available 24/7 in 100+ cities. Your ride is always just minutes away.",
    cta: "See Ride Types",
    ctaHref: "#ride-types",
  },
  {
    img: carguybanner1,
    headline: "Rides for Every Passenger",
    sub: "From budget Tuk to premium Car — pick the ride that fits your journey.",
    cta: "Explore Options",
    ctaHref: "#ride-types",
  },
];

/* ─────────────────────────────────────
   MAIN HOME COMPONENT
───────────────────────────────────── */
const Home = () => {
  const heroRef = useRef(null);
  const mapSectionRef = useRef(null);
  const [mapProgress, setMapProgress] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [slideIndex, setSlideIndex] = useState(0);

  const nextSlide = useCallback(() => {
    setSlideIndex((prev) => (prev + 1) % heroSlides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  const handleScroll = useCallback(() => {
    const section = mapSectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const sectionH = section.offsetHeight;
    const viewH = window.innerHeight;
    const scrolled = -rect.top;
    const scrollRange = sectionH - viewH;
    const p =
      scrollRange > 0 ? Math.min(Math.max(scrolled / scrollRange, 0), 1) : 0;
    setMapProgress(p);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const handleMouseMove = (e) => {
    const hero = heroRef.current;
    if (!hero) return;
    const { left, top, width, height } = hero.getBoundingClientRect();
    const x = ((e.clientX - left) / width - 0.5) * 20;
    const y = ((e.clientY - top) / height - 0.5) * -10;
    setMousePosition({ x, y });
    hero.style.setProperty("--tilt-x", `${y}deg`);
    hero.style.setProperty("--tilt-y", `${x}deg`);
  };

  const handleMouseLeave = () => {
    const hero = heroRef.current;
    if (hero) {
      hero.style.setProperty("--tilt-x", "0deg");
      hero.style.setProperty("--tilt-y", "0deg");
    }
    setMousePosition({ x: 0, y: 0 });
  };

  return (
    <div className="home-container">
      {/* ══════════ HERO ══════════ */}
      {/* ── HERO BANNER ───────────────────────────────────── */}
      <section id="home" className="hero-banner-main">
        {heroSlides.map((s, i) => (
          <div
            key={i}
            className="hero-slide-fader"
            style={{ opacity: i === slideIndex ? 1 : 0 }}
          >
            <img
              src={s.img}
              alt=""
              className="hero-slide-img"
            />
            <div className="hero-slide-overlay" />
          </div>
        ))}

        <div className="hero-banner-content">
          <div className="hero-content-inner">
            {/* Animated badge */}
            <div className="hero-badge-pill">
              <div className="badge-pulse-dot" />
              <span className="badge-text">Next-Gen Ride Sharing</span>
            </div>

            <h1 key={slideIndex} className="hero-headline-main">
              {heroSlides[slideIndex].headline.split(" ").map((word, wi) => {
                const isGreen = ["PickU", "Whenever,", "Every"].includes(word);
                return (
                  <span key={wi} className={isGreen ? "text-highlight-green" : ""}>
                    {word}{" "}
                  </span>
                );
              })}
            </h1>

            <p className="hero-subline-main">{heroSlides[slideIndex].sub}</p>

            <div className="hero-cta-group">
              <a href={heroSlides[slideIndex].ctaHref} className="cta-btn primary">
                {heroSlides[slideIndex].cta} <FaArrowRight className="cta-icon" />
              </a>
              <a href="#ride-types" className="cta-btn secondary">
                Learn More
              </a>
            </div>

            {/* Stats */}
            <div className="hero-quick-stats">
              <div className="h-q-stat">
                <FaStar size={14} className="h-q-icon" /> 4.8 Rating
              </div>
              <div className="h-q-stat">
                <FaUsers size={14} className="h-q-icon" /> 50K+ Rides
              </div>
              <div className="h-q-stat">
                <FaClock size={14} className="h-q-icon" /> 24/7 Support
              </div>
            </div>
          </div>
        </div>

        {/* Slide dots */}
        <div className="slide-dots-container">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlideIndex(i)}
              className={`slide-dot-item ${i === slideIndex ? "active" : ""}`}
            />
          ))}
        </div>

        {/* Arrows */}
        <button onClick={prevSlide} className="slide-arrow-btn left">
          <FaChevronLeft size={20} />
        </button>
        <button onClick={nextSlide} className="slide-arrow-btn right">
          <FaChevronRight size={20} />
        </button>
      </section>

      {/* ══════════ MAP ROUTE SECTION ══════════ */}
      {/* <section className="map-route-section" ref={mapSectionRef}>
        <div className="map-sticky-container">
          <div className="map-text-column">
            <div
              className="map-panel"
              style={{
                opacity:
                  mapProgress < 0.3
                    ? 1
                    : Math.max(0, 1 - (mapProgress - 0.3) * 5),
                transform: `translateY(${mapProgress < 0.3 ? 0 : (mapProgress - 0.3) * -80}px)`,
                pointerEvents: mapProgress < 0.35 ? "auto" : "none",
              }}
            >
              <div className="map-panel-tag">Step 1</div>
              <h2>Request Your Ride</h2>
              <p>
                Open the app, drop your pin. Our system instantly finds the
                nearest driver.
              </p>
              <div className="map-panel-detail">
                <FaMapMarkerAlt className="mpd-icon green" /> Pickup confirmed
              </div>
            </div>
            <div
              className="map-panel"
              style={{
                opacity:
                  mapProgress > 0.25 && mapProgress < 0.75
                    ? Math.min((mapProgress - 0.25) * 8, 1) *
                    Math.min((0.75 - mapProgress) * 8, 1)
                    : 0,
                transform: `translateY(${mapProgress < 0.5 ? (0.5 - mapProgress) * 60 : (mapProgress - 0.5) * -60}px)`,
                position: "absolute",
                pointerEvents:
                  mapProgress > 0.25 && mapProgress < 0.75 ? "auto" : "none",
              }}
            >
              <div
                className="map-panel-tag"
                style={{
                  background: "rgba(255,107,0,0.15)",
                  color: "#ff6b00",
                  borderColor: "rgba(255,107,0,0.3)",
                }}
              >
                Step 2
              </div>
              <h2>Track Live</h2>
              <p>
                Watch your taxi navigate city streets in real-time. Every turn,
                every block.
              </p>
              <div className="map-panel-detail">
                <FaCar className="mpd-icon orange" /> ETA every 5s
              </div>
            </div>
            <div
              className="map-panel"
              style={{
                opacity:
                  mapProgress > 0.65
                    ? Math.min((mapProgress - 0.65) * 6, 1)
                    : 0,
                transform: `translateY(${mapProgress > 0.65 ? 0 : (0.65 - mapProgress) * 80}px)`,
                position: "absolute",
                pointerEvents: mapProgress > 0.65 ? "auto" : "none",
              }}
            >
              <div
                className="map-panel-tag"
                style={{
                  background: "rgba(220,38,38,0.1)",
                  color: "#dc2626",
                  borderColor: "rgba(220,38,38,0.25)",
                }}
              >
                Step 3
              </div>
              <h2>You've Arrived</h2>
              <p>Reach safely. Rate, tip, and you're done — all in one tap.</p>
              <div className="map-panel-detail">
                <FaFlagCheckered className="mpd-icon red" /> Dropoff
              </div>
            </div>
          </div>
          <div className="map-canvas-column">
            <div className="map-3d-wrapper">
              <MapScene progress={mapProgress} />
            </div>
            <div
              className="map-scroll-hint"
              style={{
                opacity: mapProgress < 0.05 ? 1 : 0,
                transition: "opacity 0.4s",
              }}
            >
              <span>Scroll to drive</span>
              <div className="scroll-arrow-anim" />
            </div>
          </div>
        </div>
      </section> */}

      {/* ══════════ FEATURES ══════════
      <section className="features-section">
        <Reveal>
          <span className="section-eyebrow">Why PickU</span>
          <h2>
            Built Around <span className="highlight">You</span>
          </h2>
          <p className="section-subtitle">
            Every feature designed for comfort, safety and speed
          </p>
        </Reveal>
        <div className="features-grid">
          {[
            {
              icon: <FaShieldAlt />,
              color: "#667eea",
              title: "Safe Rides",
              desc: "Fully vetted drivers with background checks and real-time safety monitoring",
              delay: 0,
            },
            {
              icon: <FaBolt />,
              color: "#f59e0b",
              title: "Fast Pickup",
              desc: "Average wait time under 5 minutes with live GPS tracking on every trip",
              delay: 100,
            },
            {
              icon: <FaTag />,
              color: "#08d612",
              title: "Best Prices",
              desc: "Transparent fares with zero surge pricing — what you see is what you pay",
              delay: 200,
            },
            {
              icon: <FaLeaf />,
              color: "#10b981",
              title: "Eco-Friendly",
              desc: "Electric and hybrid vehicle options for sustainable, guilt-free travel",
              delay: 300,
            },
          ].map((f) => (
            <Reveal key={f.title} delay={f.delay}>
              <div className="feature-card">
                <div
                  className="feature-icon-wrap"
                  style={{ "--accent": f.color }}
                >
                  {f.icon}
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <div className="card-glow" style={{ "--accent": f.color }} />
              </div>
            </Reveal>
          ))}
        </div>
      </section> */}

      {/* ══════════ HOW IT WORKS ══════════
      <section className="how-it-works">
        <Reveal>
          <span className="section-eyebrow">The Process</span>
          <h2>
            Ride in <span className="highlight">3 Steps</span>
          </h2>
          <p className="section-subtitle">
            From request to destination in minutes
          </p>
        </Reveal>
        <div className="steps-container">
          {[
            {
              n: "01",
              icon: <FaMapMarkerAlt />,
              title: "Request",
              desc: "Enter your pickup and drop-off location",
              delay: 0,
            },
            {
              n: "02",
              icon: <FaUserCheck />,
              title: "Match",
              desc: "Instantly paired with a nearby verified driver",
              delay: 150,
            },
            {
              n: "03",
              icon: <FaFlagCheckered />,
              title: "Arrive",
              desc: "Track your ride live and reach your destination safely",
              delay: 300,
            },
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
      </section> */}

      {/* ══════════ APP SECTION ══════════ */}
      {/* <section className="app-section">
        <div className="app-bg-blobs">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
        </div>
        <div className="app-content">
          <Reveal className="app-text">
            <div>
              <span className="section-eyebrow light">Mobile App</span>
              <h2>
                Download the <span className="highlight">PickU App</span>
              </h2>
              <p>
                Book rides, track your driver in real-time, and pay seamlessly —
                all from your pocket.
              </p>
              <div className="app-buttons">
                <button className="app-btn">
                  <FaApple className="app-btn-icon" />
                  <span>
                    <small>Download on the</small>App Store
                  </span>
                </button>
                <button className="app-btn">
                  <FaGooglePlay className="app-btn-icon" />
                  <span>
                    <small>Get it on</small>Google Play
                  </span>
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
      </section> */}

      {/* ══════════ STATS ══════════
      <section className="home-stats-section">
        <div className="home-stats-inner">
          {[
            {
              target: "0",
              suffix: "",
              label: "Happy Riders",
            },
            {
              target: null,
              fixed: "Jaffna",
              label: "District"
            },
            {
              target: "0",
              suffix: "/5",
              label: "Avg Rating"
            },
            {
              target: null,
              label: "Support",
              fixed: "24/7",
            },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 100} className="stat-reveal-item">
              <div className="stat-content">
                <p className="stat-value-text">
                  {s.fixed ? (
                    s.fixed
                  ) : (
                    <Counter target={s.target} suffix={s.suffix} />
                  )}
                </p>
                <p className="stat-label-text">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section> */}
    </div>
  );
};

export default Home;
