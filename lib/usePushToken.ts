// lib/usePushToken.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useEffect, useState } from "react";

export async function usePushToken() {
  const [token, setToken] = useState<string | null>(null);
  const expoToken = (await Notifications.getExpoPushTokenAsync()).data;
  console.log("📌 Expo Push Token:", expoToken); // ✅ เอาไว้ copy
  setToken(expoToken);

  useEffect(() => {
    (async () => {
      // ขอ permission
      const { status: existing } = await Notifications.getPermissionsAsync();
      let final = existing;
      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        final = status;
      }
      if (final !== "granted") return;

      // เอา Expo Push Token
      const expoToken = (await Notifications.getExpoPushTokenAsync()).data;
      setToken(expoToken);

      // ตั้ง Android channel
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FFFFFFFF",
        });
      }
    })();
  }, []);

  return token;
}
