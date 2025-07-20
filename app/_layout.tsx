import { useCameraPermissions } from "expo-camera";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { enableScreens } from "react-native-screens";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(game)/play" options={{ headerShown: false }} />
          <Stack.Screen name="(game)/game" options={{ headerShown: false }} />
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
