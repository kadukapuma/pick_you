import { useEffect, useState } from "react";
import { router } from "expo-router";
import DelayedLoader from "../components/ui/DelayedLoader";
import RequiredUpdateScreen from "../components/update/RequiredUpdateScreen";
import { AppUpdatePolicy, checkPassengerAppUpdate } from "../services/notifications/appUpdate";

const FALLBACK_POLICY: AppUpdatePolicy = {
  app: "passenger",
  latest_version: "",
  minimum_version: "",
  title: "Update",
  message: "A new version of PickU is available.",
  website_url: "",
  required: false,
  published_at: null,
};

export default function UpdateRoute() {
  const [policy, setPolicy] = useState<AppUpdatePolicy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPassengerAppUpdate()
      .then(setPolicy)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <DelayedLoader label="Checking for updates" variant="screen" backgroundColor="#F2FBF8" />;
  }

  return (
    <RequiredUpdateScreen
      policy={policy ?? FALLBACK_POLICY}
      dismissible
      onClose={() => (router.canGoBack() ? router.back() : router.replace("/"))}
    />
  );
}
