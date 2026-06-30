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
      description: "Electric and hybrid vehicle options for sustainable travel",
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


    </div>
  );
};

export default AboutUs;
