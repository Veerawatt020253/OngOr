import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";

function FloatingPlayButton({ children, onPress, accessibilityState }) {
  const focused = accessibilityState?.selected ?? false;
  const router = useRouter(); // ✅ ใช้ router

  const handlePress = () => {
    // ✅ ไปหน้าอื่นที่อยู่นอก group (tabs) เช่น /play-screen
    router.push("/(game)/play"); // เปลี่ยนเป็น path ที่คุณต้องการ
  };
  return (
    <View style={styles.fabContainer}>
      <TouchableOpacity
        style={[styles.fabButton, focused && styles.fabButtonFocused]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Ionicons name="play" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#4A90E2",
        tabBarInactiveTintColor: "#8E8E93",
        headerShown: false,
        tabBarStyle: [
          {
            position: "absolute",
            left: 40,
            right: 40,
            marginStart: 10,
            marginEnd: 10,
            bottom: 25,
            borderRadius: 24,
            height: 75,
            backgroundColor: "#fff",
            borderTopWidth: 0,
            paddingTop: 10,
            zIndex: 10,
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.13,
                shadowRadius: 24,
              },
              android: {
                elevation: 12,
              },
            }),
          },
        ],
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "kanitM",
          marginBottom: 5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "หน้าแรก",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? "home" : "home-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: "แลกพอยท์",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? "gift" : "gift-outline"}
              color={color}
            />
          ),
        }}
      />
      {/* <Tabs.Screen
        name="play"
        options={{
          title: "",
          tabBarButton: (props) => <FloatingPlayButton {...props} />,
        }}
      /> */}
      <Tabs.Screen
        name="play"
        options={{
          title: "",
          tabBarButton: (props) => <FloatingPlayButton {...props} />,
          tabBarStyle: { display: "none" }, // ซ่อน tab bar เมื่อแสดงหน้านี้ (optional)
        }}
      />

      <Tabs.Screen
        name="guide"
        options={{
          title: "คู่มือ",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? "book" : "book-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "โปรไฟล์",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? "person" : "person-outline"}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    top: -6, // ปรับให้ลอยขึ้น (ค่าประมาณ)
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 99,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  fabButtonFocused: {
    backgroundColor: "#3578d0",
  },
});
