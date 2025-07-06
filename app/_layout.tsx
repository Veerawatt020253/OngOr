import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    kanitM: require("@/assets/fonts/KanitM.ttf"),
    kanitB: require("@/assets/fonts/KanitB.ttf"),
    starBorn: require("@/assets/fonts/Starborn.ttf"),
    maliB: require("@/assets/fonts/Mali-Bold.ttf")
  });

  useEffect(() => {
    if (loaded) {
      console.log("Loading");
      SplashScreen.hideAsync();
    } else {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // if (!loaded) {
  //   return null;
  // }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack initialRouteName="index">
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(game)/play" options={{ headerShown: false }} />
        <Stack.Screen name="(game)/game" options={{ headerShown: false }} />
        <Stack.Screen name="(page)/StatusScreen" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
