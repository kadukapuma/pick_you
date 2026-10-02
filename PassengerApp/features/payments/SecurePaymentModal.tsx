import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { paymentTheme } from "./paymentTheme";

import { isExpectedPaymentReturn, isSecurePaymentPage, type SecurePaymentSession } from "./securePaymentNavigation";

export default function SecurePaymentModal({ session, onFinish }: {
  session: SecurePaymentSession;
  onFinish: (returnUrl: string | null) => void;
}) {
  const finished = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // A stable source preserves the current bank page while loading state changes
  // or the passenger switches to SMS and returns to the app.
  const source = useMemo(() => ({ uri: session.url }), [session.url]);
  const finish = (url: string | null) => {
    if (finished.current) return;
    finished.current = true;
    onFinish(url);
  };
  const requestClose = () => Alert.alert(
    "Leave verification?",
    "Choose Stay to keep this page open. Leaving does not reverse a payment already submitted.",
    [{ text: "Stay", style: "cancel" }, { text: "Leave", onPress: () => finish(null) }],
  );
  const allowNavigation = (url: string) => {
    if (isExpectedPaymentReturn(url, session)) {
      finish(url);
      return false;
    }
    // Bank redirects may use different HTTPS hosts. Never send these links to
    // the operating system or allow arbitrary custom schemes/local files.
    return isSecurePaymentPage(url) || url === "about:blank";
  };
  const validStart = isSecurePaymentPage(session.url);

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={requestClose}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.title}>Secure verification</Text>
            <Text style={styles.caption}>You can switch to SMS and return here.</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close verification" onPress={requestClose} style={styles.close}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
        {error || !validStart ? (
          <View style={styles.error}>
            <Text style={styles.title}>Verification interrupted</Text>
            <Text style={styles.message}>{error || "The secure page address is invalid."}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => finish(null)} style={styles.button}>
              <Text style={styles.buttonText}>Return to PickU</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {loading && <ActivityIndicator accessibilityLabel="Loading secure page" color={paymentTheme.green} style={styles.loader} />}
            <WebView
              source={source}
              style={styles.webview}
              originWhitelist={["*"]}
              onShouldStartLoadWithRequest={request => allowNavigation(request.url)}
              onNavigationStateChange={navigation => {
                if (isExpectedPaymentReturn(navigation.url, session)) finish(navigation.url);
              }}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                if (!finished.current) setError("The bank page could not load. Return to PickU to check the result before trying again.");
              }}
              onRenderProcessGone={() => setError("Android closed the secure page. Return to PickU to check the result.")}
              onContentProcessDidTerminate={() => setError("The secure page was closed. Return to PickU to check the result.")}
              javaScriptEnabled
              domStorageEnabled
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              setSupportMultipleWindows={false}
              javaScriptCanOpenWindowsAutomatically
              mixedContentMode="never"
              allowFileAccess={false}
              allowFileAccessFromFileURLs={false}
              allowUniversalAccessFromFileURLs={false}
              webviewDebuggingEnabled={false}
            />
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "white" },
  header: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: paymentTheme.line },
  heading: { flex: 1 },
  title: { fontSize: 18, fontWeight: "700", color: paymentTheme.ink },
  caption: { fontSize: 12, color: paymentTheme.muted, marginTop: 4 },
  close: { padding: 12 },
  closeText: { color: paymentTheme.green, fontWeight: "700" },
  webview: { flex: 1 },
  loader: { padding: 8 },
  error: { padding: 24, gap: 16 },
  message: { color: paymentTheme.muted, lineHeight: 22 },
  button: { padding: 16, backgroundColor: paymentTheme.green, borderRadius: 12 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "700" },
});