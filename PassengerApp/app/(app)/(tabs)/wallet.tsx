import { Redirect } from "expo-router";

export default function WalletRedirect() {
  return <Redirect href="/(app)/(tabs)/account/wallet" />;
}
