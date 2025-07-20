import { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

// component
import OnboardingScreen from "./onBoardingScreen";

export default function index() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getData = async () => {
      try {
        const value = await AsyncStorage.getItem("email"); // 🔹 Use "email" (correct key)
        if (value !== null) {
          console.log("User is logged in:", value);
          router.push("/(tabs)")
        } else {
          console.log("No user found.");
        }
      } catch (e) {
        console.error("Error reading value:", e);
      } finally {
        setLoading(false); //  Ensure `setLoading` runs
      }
    };

    getData(); //  Call the function inside useEffect
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <OnboardingScreen />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});