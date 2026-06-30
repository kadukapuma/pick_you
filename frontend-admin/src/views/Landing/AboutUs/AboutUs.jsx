import "./AboutUs.css";
import drivegreen from "../../../assets/drivegreen.png";
import saferide from "../../../assets/saferide.png";
import profitable from "../../../assets/profitable.png";
import fastarrive from "../../../assets/fastarrive.png";

const AboutUs = () => {
  const features = [
    {
      image: saferide,
      title: "Safe Rides",
      description: "Fully vetted drivers with background checks",
    },
    {
      image: fastarrive, // using as placeholder for now
      title: "Fast Pickup",
      description: "Average wait time under 5 minutes",
    },
    {
      image: profitable, // using as placeholder for now
      title: "Best Prices",
      description: "Competitive rates with no surge pricing",
    },
    {
      image: drivegreen, // using as placeholder for now
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
            <img src={feature.image} alt={feature.title} className="feature-background" />
            <div className="feature-overlay"></div>
            <div className="feature-content-modern">
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          </div>
        ))}
      </div>


    </div>
  );
};

export default AboutUs;
