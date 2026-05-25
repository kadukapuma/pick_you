import { createNativeStackNavigator } from "@react-navigation/native-stack";

import GetStartedScreen from "../screens/Auth/GetStartedScreen";
import LoginScreen from "../screens/Auth/LoginScreen";
import OTPScreen from "../screens/Auth/OtpScreen";
import RegisterScreen from "../screens/Auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/Auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/Auth/ResetPasswordScreen";

const Stack = createNativeStackNavigator();

const AuthNavigator = ({ setIsLoggedIn, setIsNewUser, setDriverStatus, setDriver }) => {
  const handleExitToGetStarted = (navigation) => {
    navigation.reset({
      index: 0,
      routes: [{ name: "GetStarted" }],
    });
  };

  return (
    <Stack.Navigator
      initialRouteName="GetStarted"
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

      <Stack.Screen name="OTP">
        {(props) => (
          <OTPScreen
            {...props}
            setIsLoggedIn={setIsLoggedIn}
            setIsNewUser={setIsNewUser}
            setDriverStatus={setDriverStatus}
            setDriver={setDriver}
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
    </Stack.Navigator>
  );
};

export default AuthNavigator;
