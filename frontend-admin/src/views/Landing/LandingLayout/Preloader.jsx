import React from 'react';
import Lottie from 'lottie-react';
import carAnimation from '../../../assets/Car_Animation.json';
import logo from '../../../assets/logo.png';
import './Preloader.css';

const LottieComponent = Lottie.default || Lottie;

const Preloader = ({ isFading }) => {
    return (
        <div className={`preloader-overlay ${isFading ? 'fade-out' : ''}`}>
            <div className="preloader-content">
                <div className="preloader-top">
                    <img src={logo} alt="PickYou Logo" className="preloader-logo" />
                </div>

                <div className="preloader-animation-container">
                    <LottieComponent
                        animationData={carAnimation}
                        loop={true}
                        autoplay={true}
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>

                <div className="preloader-bottom">
                    <p className="preloader-slogan">Your Journey, Our Priority.</p>
                </div>
            </div>
        </div>
    );
};

export default Preloader;
