import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
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
  const [showCamera, setShowCamera] = useState(false);
  const [isComponentMounted, setIsComponentMounted] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);

  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const navigationTimeoutRef = useRef(null);

  // Cleanup function
  const cleanup = () => {
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
  };

  // Component cleanup
  useEffect(() => {
    return () => {
      setIsComponentMounted(false);
      setShowCamera(false);
      setCameraReady(false);
      cleanup();
    };
  }, []);

  // Initialize camera after permission granted
  useEffect(() => {
    if (permission?.granted && isComponentMounted) {
      const timer = setTimeout(() => {
        setShowCamera(true);
        setCameraKey((prev) => prev + 1);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [permission?.granted, isComponentMounted]);

  // Safe navigation
  const navigateToGame = () => {
    if (!isComponentMounted) return;

    try {
      cleanup();
      setShowCamera(false);
      setCameraReady(false);

      navigationTimeoutRef.current = setTimeout(() => {
        // router.replace("/(game)/game");
        router.replace("/(game)/webgame");
      }, 300);
    } catch (error) {
      Alert.alert("Error", "ไม่สามารถเข้าสู่เกมได้");
    }
  };

  const navigateToTabs = () => {
    if (!isComponentMounted) return;

    try {
      cleanup();
      setShowCamera(false);
      setCameraReady(false);

      navigationTimeoutRef.current = setTimeout(() => {
        router.replace("/(tabs)");
      }, 300);
    } catch (error) {
      Alert.alert("Error", "ไม่สามารถกลับหน้าหลักได้");
    }
  };

  // Button animation
  const animateButton = () => {
    if (!isComponentMounted) return;

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

  // Handle ready press
  const handleReadyPress = () => {
    if (!permission?.granted) {
      Alert.alert("Error", "ไม่มีสิทธิ์เข้าถึงกล้อง");
      return;
    }

    if (!cameraReady) {
      Alert.alert("Error", "กล้องยังไม่พร้อม กรุณารอสักครู่");
      return;
    }

    setIsReady(true);
    animateButton();

    setTimeout(() => {
      navigateToGame();
    }, 500);
  };

  // Handle back press
  const handleBackPress = () => {
    if (!isComponentMounted) return;
    navigateToTabs();
  };

  // Handle camera ready
  const handleCameraReady = () => {
    setCameraReady(true);
  };

  // Handle camera error
  const handleCameraError = (error) => {
    Alert.alert("Camera Error", "เกิดข้อผิดพลาดกับกล้อง");
    setShowCamera(false);
    setCameraReady(false);
  };

  // Permission loading
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>กำลังโหลด...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            เราต้องการสิทธิ์ในการใช้กล้องเพื่อเริ่มเกม
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => {
              requestPermission().catch((error) => {
                Alert.alert("Error", "ไม่สามารถขอสิทธิ์ได้");
              });
            }}
          >
            <Text style={styles.permissionButtonText}>อนุญาต</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraBackground}>
        {/* Camera */}
        {showCamera && permission.granted && (
          <View key={`camera-${cameraKey}`} style={StyleSheet.absoluteFill}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="front"
              onCameraReady={handleCameraReady}
              onMountError={handleCameraError}
            />
          </View>
        )}

        {/* Frame overlay */}
        <ImageBackground
          source={require("../../assets/Frame.png")}
          style={styles.gameFrameOverlay}
          imageStyle={{ resizeMode: "stretch" }}
          pointerEvents="none"
        />

        {/* UI Overlay */}
        <View style={styles.overlayContainer} pointerEvents="box-none">
          {/* Header */}
          <View style={styles.headerContainer}>
            <Image
              source={require("../../assets/SectionText.png")}
              style={styles.headerImage}
              resizeMode="contain"
            />
          </View>

          {/* Bottom UI */}
          <View style={styles.bottomContainer}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              activeOpacity={0.7}
            >
              <Image
                source={require("../../assets/Undo.png")}
                style={styles.backIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Ready Button */}
            <View style={styles.readyButtonContainer}>
              <Animated.View
                style={[
                  styles.readyButtonWrapper,
                  { transform: [{ scale: scaleAnim }] },
                ]}
              >
                <TouchableOpacity
                  style={styles.readyButton}
                  onPress={handleReadyPress}
                  disabled={isReady || !cameraReady}
                  activeOpacity={0.8}
                >
                  <Image
                    source={require("../../assets/readybtn.png")}
                    style={[
                      styles.readyButtonImage,
                      { opacity: isReady || !cameraReady ? 0.6 : 1 },
                    ]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Mascot */}
            <View style={styles.mascotContainer}>
              <Image
                source={require("../../assets/Ongor1.png")}
                style={[styles.mascotImage, { opacity: isReady ? 0.6 : 1 }]}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F4FD",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E8F4FD",
  },
  loadingText: {
    fontSize: 18,
    color: "#2E5BBA",
    fontFamily: "kanitM",
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
    fontFamily: "kanitB",
  },
  cameraBackground: {
    flex: 1,
    position: "relative",
  },
  gameFrameOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  headerContainer: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  headerImage: {
    width: 400,
    height: 600,
    marginTop: -10,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 20,
  },
  backButton: {
    position: "absolute",
    bottom: -20,
    left: 0,
    padding: 10,
    zIndex: 20,
  },
  backIcon: {
    width: 100,
    height: 100,
  },
  readyButtonContainer: {
    alignItems: "center",
    marginBottom: 20,
    zIndex: 30,
  },
  readyButtonWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 31,
  },
  readyButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 32,
  },
  readyButtonImage: {
    width: 200,
    height: 100,
    zIndex: 10,
    top: 60,
  },
  statusText: {
    fontSize: 14,
    color: "#2E5BBA",
    fontFamily: "kanitM",
    marginTop: 10,
    textAlign: "center",
  },
  mascotContainer: {
    alignItems: "flex-end",
    paddingRight: 20,
  },
  mascotImage: {
    width: 250,
    height: 250,
    top: 30,
    right: -40,
  },
});

export default PlayScreen;
