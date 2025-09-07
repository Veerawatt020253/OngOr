import { useRouter } from "expo-router"; // + เพิ่มบรรทัดนี้
import { useCameraPermissions } from "expo-camera";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,

    // iOS 14+ ต้องเลือกว่าจะให้แจ้งเตือนแบบไหน
    shouldShowBanner: true, // ขึ้น banner ด้านบน
    shouldShowList: true, // แสดงใน Notification Center
  }),
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const router = useRouter(); // + เพิ่มบรรทัดนี้เหนือ useEffect ด้านล่าง

export default function RootLayout() {
  const [permission, requestPermission] = useCameraPermissions();
  // const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    kanitM: require("@/assets/fonts/KanitM.ttf"),
    kanitB: require("@/assets/fonts/Kanit-SemiBold.ttf"),
    starBorn: require("@/assets/fonts/Starborn.ttf"),
    maliB: require("@/assets/fonts/Mali-Bold.ttf"),
  });

  useEffect(() => {
    if (!permission || permission.status !== "granted") {
      requestPermission();
    }
  }, []);

  useEffect(() => {
    // เมื่อผู้ใช้ "แตะ" แจ้งเตือน
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = res.notification.request.content.data as any;

      // คาดหวังว่าจะส่ง data.screen มาจาก push payload
      // เช่น data: { "screen": "(page)/StatusScreen" }
      if (data?.screen) {
        router.push(`/${data.screen}`);
      }
    });

    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (loaded) {
      console.log("Loading");
      SplashScreen.hideAsync();
    } else {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack initialRouteName="index">
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen
            name="(auth)/register"
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="(auth)/verify-email"
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="(auth)/forgot-password"
            options={{ headerShown: false }}
          />

          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          <Stack.Screen name="(game)/play" options={{ headerShown: false }} />
          <Stack.Screen name="(game)/game" options={{ headerShown: false }} />
          <Stack.Screen
            name="(game)/webgame"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="(page)/StatusScreen"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="(page)/ProfileSettingsScreen"
            options={{ headerShown: false }}
          />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
