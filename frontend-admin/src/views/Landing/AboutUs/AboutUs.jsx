import "./AboutUs.css";

const AboutUs = () => {
  const features = [
    {
      icon: "🚗",
      title: "Safe Rides",
      description: "Fully vetted drivers with background checks",
    },
    {
      icon: "⚡",
      title: "Fast Pickup",
      description: "Average wait time under 5 minutes",
    },
    {
      icon: "💰",
      title: "Best Prices",
      description: "Competitive rates with no surge pricing",
    },
    {
      icon: "🌍",
      title: "Eco-Friendly",
      description: "Electric and hybrid vehicle options",
    },
  ];

  const rideTypes = [
    {
      icon: "🚘",
      name: "Economy",
      description: "Budget-friendly daily commute",
      price: "from $5",
      suitable: "Daily Commuters",
    },
    {
      icon: "🚙",
      name: "Premium",
      description: "Comfortable leather seats, extra legroom",
      price: "from $12",
      suitable: "Business Travelers",
    },
    {
      icon: "🚐",
      name: "SUV/Van",
      description: "Space for up to 6 passengers",
      price: "from $18",
      suitable: "Groups & Families",
    },
    {
      icon: "✨",
      name: "Luxury",
      description: "Premium vehicles with professional chauffeurs",
      price: "from $30",
      suitable: "Special Occasions",
    },
  ];

  return (
    <div className="about-container">
      {/* Hero Section */}
      <div className="about-hero">
        <h1>
          About <span className="highlight">PickYou</span>
        </h1>
        <p>Revolutionizing urban mobility with technology and trust</p>
      </div>

      {/* Mission Section */}
      <div className="mission-section">
        <h2>Our Mission</h2>
        <p>
          To provide seamless, safe, and sustainable transportation that
          connects people to places they love.
        </p>
      </div>

      {/* Features Grid */}
      <div className="features-grid">
        {features.map((feature, index) => (
          <div key={index} className="feature-card">
            <div className="feature-icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Ride Types Section */}
      <div className="ride-types-section">
        <h2>Find Your Perfect Ride</h2>
        <p className="section-subtitle">
          Choose the ride that suits your journey
        </p>

        <div className="ride-grid">
          {rideTypes.map((ride, index) => (
            <div key={index} className="ride-card">
              <div className="ride-icon">{ride.icon}</div>
              <h3>{ride.name}</h3>
              <p className="ride-description">{ride.description}</p>
              <div className="ride-price">{ride.price}</div>
              <div className="ride-suitable">
                <span className="suitable-tag">✓ {ride.suitable}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-section">
        <div className="stat-item">
          <div className="stat-number">50K+</div>
          <div className="stat-label">Happy Riders</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">100+</div>
          <div className="stat-label">Cities</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">4.9⭐</div>
          <div className="stat-label">Rating</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">24/7</div>
          <div className="stat-label">Support</div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
