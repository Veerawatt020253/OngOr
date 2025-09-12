import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/FirebaseConfig";

/* ---------- responsive helpers (base width 390, base height 844) ---------- */
function makeScalers(width: number, height: number, fontScale: number) {
  const BASE_W = 390;
  const BASE_H = 844;
  const s = Math.min(width / BASE_W, 1.35);
  const vs = Math.min(height / BASE_H, 1.35);
  const scale = (n: number) => Math.round(n * s);
  const vscale = (n: number) => Math.round(n * vs);
  const fscale = (n: number) => Math.round((n * s) / Math.max(fontScale, 1));
  return { scale, vscale, fscale };
}

/* ======================== Forgot Password Screen ======================== */
const ForgotPassword = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;

  const { scale, vscale, fscale } = useMemo(
    () => makeScalers(width, height, fontScale),
    [width, height, fontScale]
  );

  const TOP_GAP = Math.max(insets.top, 12); // กันชนแถบระบบ iOS

  const styles = useMemo(() => {
    const CARD_MAX = isTablet ? scale(620) : scale(520);
    const H_PADDING = isTablet ? scale(22) : scale(16);

    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: "#EEF4FF",
        alignItems: "center",
        paddingHorizontal: H_PADDING,
        paddingTop: TOP_GAP + vscale(44), // ขยับลงตาม safe-area
        paddingBottom: vscale(24),
      },
      backButton: {
        position: "absolute",
        top: TOP_GAP, // ปุ่มไม่ชนแถบระบบ
        left: scale(14),
        zIndex: 10,
        backgroundColor: "#ffffff",
        padding: scale(8),
        borderRadius: 999,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 2,
      },
      logo: {
        width: isTablet ? scale(160) : scale(120),
        height: isTablet ? scale(160) : scale(120),
        marginTop: vscale(12) + TOP_GAP * 0.2,
      },
      title: {
        fontSize: fscale(isTablet ? 28 : 26),
        marginTop: vscale(8),
        color: "#2423ff",
        fontFamily: "kanitB",
        textAlign: "center",
      },
      subtitle: {
        fontSize: fscale(14),
        color: "#3b6fb6",
        fontFamily: "kanitM",
        marginTop: vscale(6),
        marginBottom: vscale(16),
        textAlign: "center",
        paddingHorizontal: scale(20),
      },
      card: {
        width: "100%",
        maxWidth: CARD_MAX,
        backgroundColor: "#FFFFFF",
        borderRadius: scale(20),
        paddingHorizontal: scale(16),
        paddingVertical: vscale(18),
        borderWidth: 1,
        borderColor: "#D8E6FF",
        shadowColor: "#3578d0",
        shadowOpacity: 0.07,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 18,
        elevation: 2,
        alignSelf: "center",
      },
      inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        borderRadius: scale(14),
        borderColor: "#dfe5ef",
        backgroundColor: "#fff",
        paddingHorizontal: scale(12),
        paddingVertical: vscale(8),
        marginBottom: vscale(18),
      },
      input: {
        flex: 1,
        fontSize: fscale(16),
        fontFamily: "kanitM",
        color: "#0F2B56",
      },
      submit: {
        backgroundColor: "#2423ff",
        marginTop: vscale(6),
        paddingVertical: vscale(12),
        borderRadius: scale(14),
        alignItems: "center",
        shadowColor: "#2423ff",
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 10,
        elevation: 3,
      },
      submitText: { color: "#fff", fontSize: fscale(16), fontFamily: "kanitB" },
      // ให้คอนเทนต์ยืดอย่างน้อยเท่าความสูง เพื่อคงกลางหน้าจอ (แนวนอน/แท็บเล็ต)
      scrollContent: {
        flexGrow: 1,
        minHeight: height,
        paddingBottom: vscale(16),
      },
    });
  }, [width, height, fontScale, scale, vscale, fscale, isTablet, TOP_GAP]);

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const handleReset = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert("อีเมลไม่ถูกต้อง", "กรุณากรอกอีเมลที่ถูกต้องก่อน");
      return;
    }
    try {
      setBusy(true);
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert("ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว", "กรุณาตรวจสอบกล่องอีเมลของคุณ");
      router.replace("/(auth)/login"); // กลับไปหน้า Login
    } catch (e: any) {
      Alert.alert("เกิดข้อผิดพลาด", e?.message || "ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaProvider>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? Math.max(TOP_GAP, 60) : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            {/* Back */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace("/(auth)/login")}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={scale(22)} color="#0F2B56" />
            </TouchableOpacity>

            {/* Logo */}
            <Image
              source={{ uri: "https://img2.pic.in.th/pic/LogoRound.png" }}
              style={styles.logo}
              resizeMode="contain"
            />

            {/* Title */}
            <Text style={styles.title}>ลืมรหัสผ่าน</Text>
            <Text style={styles.subtitle}>
              ป้อนอีเมลของคุณ แล้วเราจะส่งลิงก์รีเซ็ตรหัสผ่านให้
            </Text>

            {/* Card */}
            <View style={styles.card}>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={scale(18)}
                  color="#8aa0c2"
                  style={{ marginRight: scale(6) }}
                />
                <TextInput
                  style={styles.input}
                  placeholder="กรอกอีเมลของคุณ"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="#9aa3b2"
                  returnKeyType="send"
                  onSubmitEditing={handleReset}
                />
              </View>

              {/* Reset Button */}
              <TouchableOpacity
                style={[styles.submit, busy && { opacity: 0.7 }]}
                onPress={handleReset}
                disabled={busy}
                activeOpacity={0.9}
              >
                <Text style={styles.submitText}>
                  {busy ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );
};

export default ForgotPassword;
