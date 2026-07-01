import { createNativeStackNavigator } from "@react-navigation/native-stack";

import GetStartedScreen from "../screens/Auth/GetStartedScreen";
import LoginScreen from "../screens/Auth/LoginScreen";
import OTPScreen from "../screens/Auth/OtpScreen";
import RegisterScreen from "../screens/Auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/Auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/Auth/ResetPasswordScreen";
import LegalDocumentScreen from "../screens/Auth/LegalDocumentScreen";

const Stack = createNativeStackNavigator();

const AuthNavigator = ({
  setIsLoggedIn,
  setIsNewUser,
  setDriverStatus,
  setDriver,
  verificationUser,
  setVerificationUser,
}) => {
  const handleExitToGetStarted = (navigation) => {
    navigation.reset({
      index: 0,
      routes: [{ name: "GetStarted" }],
    });
  };

  const initialRouteName = verificationUser ? "OTP" : "GetStarted";
  const otpInitialParams = verificationUser
    ? {
        isRegistration: true,
        email: verificationUser.email,
        phone: verificationUser.phone,
        shouldAutoSendOtp: true,
      }
    : undefined;

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="GetStarted" component={GetStartedScreen} />

      <Stack.Screen name="Login">
        {(props) => (
          <LoginScreen
            {...props}
            setIsLoggedIn={setIsLoggedIn}
            setIsNewUser={setIsNewUser}
            setDriverStatus={setDriverStatus}
            setDriver={setDriver}
            setVerificationUser={setVerificationUser}
            onExit={() => handleExitToGetStarted(props.navigation)}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Register">
        {(props) => (
          <RegisterScreen
            {...props}
            onExit={() => handleExitToGetStarted(props.navigation)}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="OTP" initialParams={otpInitialParams}>
        {(props) => (
          <OTPScreen
            {...props}
            setIsLoggedIn={setIsLoggedIn}
            setIsNewUser={setIsNewUser}
            setDriverStatus={setDriverStatus}
            setDriver={setDriver}
            setVerificationUser={setVerificationUser}
            onExit={() => handleExitToGetStarted(props.navigation)}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="ForgotPassword">
        {(props) => (
          <ForgotPasswordScreen
            {...props}
            onExit={() => handleExitToGetStarted(props.navigation)}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="ResetPassword">
        {(props) => (
          <ResetPasswordScreen
            {...props}
            onExit={() => handleExitToGetStarted(props.navigation)}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="PrivacyPolicy">
        {(props) => (
          <LegalDocumentScreen
            {...props}
            route={{ ...props.route, params: { type: "privacy" } }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="TermsConditions">
        {(props) => (
          <LegalDocumentScreen
            {...props}
            route={{ ...props.route, params: { type: "terms" } }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default AuthNavigator;
