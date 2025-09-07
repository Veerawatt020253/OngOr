// index.tsx
import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/FirebaseConfig";
import OnboardingScreen from "./onBoardingScreen";
import { usePushToken } from "@/lib/usePushToken";

export default function Index() {
  const [checked, setChecked] = useState(false);
  const [route, setRoute] = useState<"/(auth)/verify-email" | "/(tabs)" | null>(
    null
  );

  const token = usePushToken(); // ✅ ดึง token ที่นี่เลย

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (user.emailVerified) setRoute("/(tabs)");
        else setRoute("/(auth)/verify-email");
      }
      setChecked(true);
    });
    return () => unsub();
  }, []);

  if (!checked) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3578d0" />
      </View>
    );
  }

  if (route) {
    return <Redirect href={route} />;
  }

  return <OnboardingScreen />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
});
