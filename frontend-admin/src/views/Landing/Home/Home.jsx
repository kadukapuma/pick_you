import './Home.css';

const Home = () => {
    return (
        <div className="home-container">
            <section className="hero">
                <h1>The Smarter Way to Move</h1>
                <p>Welcome to PickYou. We provide reliable, safe, and affordable transportation solutions for everyone.</p>
                <div className="hero-btns">
                    <button className="primary-btn">Book a Ride</button>
                    <button className="secondary-btn">Learn More</button>
                </div>
            </section>
        </div>
    );
};

export default Home;
