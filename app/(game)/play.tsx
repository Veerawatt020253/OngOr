// screens/GameReadyScreen.jsx
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

const PlayScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const router = useRouter();

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const countdownAnim = useRef(new Animated.Value(0)).current;

  // ฟังก์ชันนับถอยหลัง
  const startCountdown = () => {
    setShowCountdown(true);
    setCountdown(3);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(countdownInterval);
          setTimeout(() => {
            router.push("/(game)/game");
          }, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Animation สำหรับปุ่ม
  const animateButton = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Animation สำหรับ countdown
  useEffect(() => {
    if (showCountdown) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(countdownAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(countdownAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [showCountdown]);

  const handleReadyPress = () => {
    setIsReady(true);
    animateButton();
    startCountdown();
  };

  if (!permission) {
    return <View style={styles.loadingContainer} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            เราต้องการสิทธิ์ในการใช้กล้องเพื่อเริ่มเกม
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>อนุญาต</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* กล้องเป็นพื้นหลัง */}
      <View style={styles.cameraBackground}>
        <CameraView style={styles.fullScreenCamera} facing="front" />

        {/* ImageBackground ครอบกล้อง */}
        <ImageBackground
          source={require("@/assets/Frame.png")}
          style={styles.gameFrameOverlay}
          imageStyle={{ resizeMode: "stretch" }}
          pointerEvents="none"
        />
        {/* UI Overlay */}
        <View style={styles.overlayContainer}>
          {/* Header - รูปภาพเพียงอย่างเดียว */}
          <View style={styles.headerContainer}>
            <Image
              source={require("@/assets/SectionText.png")}
              style={{
                width: 400,
                height: 600,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 5,
                elevation: 3,
                marginTop: -10,
                position: "fixed",
              }}
              resizeMode="contain"
            />
          </View>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Bottom UI */}
          <View style={styles.bottomUI}>
            {/* ปุ่มย้อนกลับ - ซ้ายล่างสุด */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Image
                source={require("@/assets/Undo.png")} // รูปไอคอนย้อนกลับ
                style={styles.backIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Mascot Button - แทนปุ่ม "พร้อมแล้ว" */}
            <View style={styles.buttonContainer}>
              <Animated.View
                style={[
                  styles.mascotButtonWrapper,
                  { transform: [{ scale: scaleAnim }] },
                ]}
              >
                <TouchableOpacity
                  style={styles.mascotButton}
                  onPress={handleReadyPress}
                  disabled={isReady}
                  activeOpacity={0.8}
                >
                  <Image
                    source={require("@/assets/readybtn.png")} // รูปมาสคอตของคุณ
                    style={[
                      { opacity: isReady ? 0.6 : 1, width: 250 }, // ลดความชัดเมื่อกดแล้ว
                    ]}
                    resizeMode="contain"
                  />
                  {/* ข้อความสถานะ */}
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Info Section */}
            <View style={styles.infoContainer}>
              <Image
                source={require("@/assets/Ongor1.png")} // รูปมาสคอตของคุณ
                style={[
                  styles.mascotImage,
                  { opacity: isReady ? 0.6 : 1 }, // ลดความชัดเมื่อกดแล้ว
                ]}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>
      </View>

      {/* Countdown Overlay */}
      {showCountdown && countdown > 0 && (
        <View style={styles.countdownOverlay}>
          <Animated.View
            style={[
              styles.countdownContainer,
              {
                opacity: countdownAnim,
                transform: [
                  {
                    scale: countdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1.2],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.countdownText}>{countdown}</Text>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#E8F4FD",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "#E8F4FD",
  },
  permissionText: {
    fontSize: 18,
    color: "#2E5BBA",
    fontFamily: "kanitM",
    textAlign: "center",
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "kanitM",
  },
  cameraBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fullScreenCamera: {
    flex: 1,
  },
  gameFrameOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    justifyContent: "space-between", // ให้ header อยู่บน, bottomUI อยู่ล่าง
  },

  headerContainer: {
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 10,
    zIndex: 10,
  },
  headerBox: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2E5BBA",
    fontFamily: "kanitB",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 18,
    color: "#2E5BBA",
    fontFamily: "kanitM",
    textAlign: "center",
    marginTop: 2,
  },
  buttonContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  readyButtonWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  readyButton: {
    paddingHorizontal: 50,
    paddingVertical: 18,
    borderRadius: 30,
    minWidth: 200,
    alignItems: "center",
  },
  readyButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "kanitM",
  },
  infoContainer: {
    paddingHorizontal: 20,
    marginBottom: -50,
    alignItems: "flex-end",
  },
  infoBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  infoText: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    marginBottom: 3,
    fontFamily: "kanitM",
  },
  readyStatusBox: {
    backgroundColor: "#E8F4FD",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    marginTop: 8,
    alignSelf: "center",
  },
  readyStatusText: {
    fontSize: 14,
    color: "#2E5BBA",
    fontWeight: "bold",
    fontFamily: "kanitM",
  },
  countdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  countdownContainer: {
    backgroundColor: "#FFFFFF",
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  countdownText: {
    fontSize: 60,
    fontWeight: "bold",
    color: "#2946FF",
    fontFamily: "kanitB",
  },
  headerContainer: {
    position: "absolute", // เพิ่ม absolute positioning
    top: 50,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10, // ให้อยู่ด้านบนสุด
  },
  headerBox: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  bottomUI: {
    width: "100%",
    paddingTop: 20,
    paddingBottom: -25,
    alignItems: "center",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },

  // ปุ่มย้อนกลับ - ซ้ายล่างสุด
  backButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    borderRadius: 25,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 20,
  },
  backIcon: {
    width: 24,
    height: 24,
  },

  // ปุ่มมาสคอต
  buttonContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  mascotButtonWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mascotButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    minWidth: 160,
    minHeight: 160,
    marginBottom: -170,
  },
  mascotImage: {
    width: 300,
    height: 300,
    marginBottom: 10,
  },
  mascotButtonText: {
    color: "#2E5BBA",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "kanitM",
    textAlign: "center",
  },

  // ปรับ header image ให้เหมาะสม
  headerImageOnly: {
    width: 250, // ลดจาก 400
    height: 80, // ลดจาก 600
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
    marginTop: 10, // เปลี่ยนจาก -10
  },
});

export default PlayScreen;
