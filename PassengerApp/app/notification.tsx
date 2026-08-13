import { router, useLocalSearchParams } from "expo-router";
import NotificationDetailScreen from "../components/notifications/NotificationDetailScreen";

export default function NotificationRoute() {
  const { title, message } = useLocalSearchParams<{ title?: string; message?: string }>();

  return (
    <NotificationDetailScreen
      title={title}
      message={message}
      onClose={() => (router.canGoBack() ? router.back() : router.replace("/"))}
    />
  );
}
