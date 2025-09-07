import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
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
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/FirebaseConfig";

/* ======================== Forgot Password Screen ======================== */
const ForgotPassword = () => {
  const router = useRouter();
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
      Alert.alert(
        "ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว",
        "กรุณาตรวจสอบกล่องอีเมลของคุณ"
      );
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
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <SafeAreaView style={styles.container}>
            {/* Back */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace("/(auth)/login")}
            >
              <Ionicons name="arrow-back" size={22} color="#0F2B56" />
            </TouchableOpacity>

            {/* Logo */}
            <Image
              source={{ uri: "https://img2.pic.in.th/pic/LogoRound.png" }}
              style={styles.logo}
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
                  size={18}
                  color="#8aa0c2"
                  style={{ marginRight: 6 }}
                />
                <TextInput
                  style={styles.input}
                  placeholder="กรอกอีเมลของคุณ"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="#9aa3b2"
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

/* ======================== Styles ======================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 24,
  },
  backButton: {
    position: "absolute",
    top: 18,
    left: 14,
    zIndex: 10,
    backgroundColor: "#ffffff",
    padding: 8,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  logo: { width: 120, height: 120, marginTop: 12 },
  title: {
    fontSize: 26,
    marginTop: 8,
    color: "#2423ff",
    fontFamily: "kanitB",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#3b6fb6",
    fontFamily: "kanitM",
    marginTop: 6,
    marginBottom: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "#D8E6FF",
    shadowColor: "#3578d0",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    borderColor: "#dfe5ef",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 18,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "kanitM",
    color: "#0F2B56",
  },
  submit: {
    backgroundColor: "#2423ff",
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#2423ff",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3,
  },
  submitText: { color: "#fff", fontSize: 16, fontFamily: "kanitB" },
});
