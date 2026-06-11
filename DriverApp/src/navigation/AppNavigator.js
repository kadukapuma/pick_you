import React from "react";

import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";

const AppNavigator = ({
  isLoggedIn,
  setIsLoggedIn,
  isNewUser,
  setIsNewUser,
  driverStatus,
  setDriverStatus,
  driver,
  setDriver,
  verificationUser,
  setVerificationUser,
}) => {
  return isLoggedIn ? (
    <MainNavigator
      isNewUser={isNewUser}
      setIsNewUser={setIsNewUser}
      driverStatus={driverStatus}
      setIsLoggedIn={setIsLoggedIn}
      setDriverStatus={setDriverStatus}
      driver={driver}
      setDriver={setDriver}
    />
  ) : (
    <AuthNavigator
      setIsLoggedIn={setIsLoggedIn}
      setIsNewUser={setIsNewUser}
      setDriverStatus={setDriverStatus}
      setDriver={setDriver}
      verificationUser={verificationUser}
      setVerificationUser={setVerificationUser}
    />
  );
};

export default AppNavigator;
