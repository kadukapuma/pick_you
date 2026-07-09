import React from 'react';
import "./AboutUs.css";

const AboutUs = () => {
  const aboutItems = [
    {
      title: "Who We Are",
      description: "PickYou started with a simple idea: to make urban transportation more accessible, reliable, and fair for everyone. We believe in empowering both riders and drivers through innovative technology and a commitment to transparency.",
    },
    {
      title: "Our Vision",
      description: "To build a future where mobility is seamless, sustainable, and entirely focused on the needs of the community. We're continuously working to reduce environmental impact while maximizing efficiency.",
    },
    {
      title: "Core Values",
      description: "Integrity, safety, and community drive everything we do. We prioritize the well-being of our users by ensuring rigorous safety standards and fostering a culture of mutual respect on our platform.",
    }
  ];

  const statsData = [
    { number: "1M+", label: "Rides Completed" },
    { number: "50k+", label: "Registered Drivers" },
    { number: "25+", label: "Cities Covered" },
    { number: "4.9", label: "Average Rating" },
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
          connects people to places they love, while creating meaningful opportunities for our drivers.
        </p>
      </div>

      {/* Info Cards Grid */}
      <div className="about-cards-container">
        {aboutItems.map((item, index) => (
          <div key={index} className="about-info-card">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>
        ))}
      </div>


    </div>
  );
};

export default AboutUs;
