// app/(auth)/verify-email.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { auth } from "@/FirebaseConfig";
import { sendEmailVerification, signOut, reload } from "firebase/auth";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const email = user?.email ?? "-";

  const handleResend = async () => {
    if (!user) return;
    try {
      setSending(true);
      await sendEmailVerification(user);
      Alert.alert("ส่งอีเมลแล้ว", "กรุณาตรวจสอบกล่องจดหมายของคุณ");
    } catch (e: any) {
      Alert.alert("ส่งไม่สำเร็จ", e?.message || "ลองใหม่อีกครั้ง");
    } finally {
      setSending(false);
    }
  };

  const handleCheck = async () => {
    if (!user) return;
    try {
      setChecking(true);
      await reload(user); // ← สำคัญ: refresh สถานะล่าสุดจากเซิร์ฟเวอร์
      if (auth.currentUser?.emailVerified) {
        Alert.alert("ยืนยันสำเร็จ", "ขอบคุณ! กำลังพาเข้าสู่แอป");
        router.replace("/(tabs)");
      } else {
        Alert.alert("ยังไม่ยืนยัน", "ตรวจสอบลิงก์ในอีเมลแล้วกดปุ่มนี้อีกครั้ง");
      }
    } catch (e: any) {
      Alert.alert("ตรวจสอบไม่สำเร็จ", e?.message || "ลองใหม่อีกครั้ง");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ยืนยันอีเมลของคุณ</Text>
      <Text style={styles.desc}>
        เราได้ส่งอีเมลยืนยันไปที่ <Text style={styles.emph}>{email}</Text>
        {"\n"}โปรดเปิดลิงก์ในอีเมล จากนั้นกด “ตรวจสอบอีกครั้ง”
      </Text>

      <Image
        source={{ uri: "https://img2.pic.in.th/pic/verify-mail.png" }}
        style={{ width: 180, height: 180, marginVertical: 10 }}
      />

      <View style={{ height: 10 }} />

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: "#3578d0" }]}
        onPress={handleResend}
        disabled={sending}
      >
        {sending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="mail-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>ส่งอีเมลยืนยันอีกครั้ง</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: "#10b981" }]}
        onPress={handleCheck}
        disabled={checking}
      >
        {checking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>ตรวจสอบอีกครั้ง</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btnGhost]} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#3578d0" />
        <Text style={styles.btnGhostText}>ออกจากระบบ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    color: "#226cb0",
    fontFamily: "kanitB",
    marginBottom: 6,
    textAlign: "center",
  },
  desc: {
    fontSize: 14,
    color: "#35649a",
    fontFamily: "kanitM",
    textAlign: "center",
    lineHeight: 20,
  },
  emph: { color: "#0F2B56", fontFamily: "kanitB" },

  btn: {
    width: "100%",
    maxWidth: 400,
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  btnText: { color: "#fff", fontFamily: "kanitB", fontSize: 15 },
  btnGhost: {
    width: "100%",
    maxWidth: 400,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#CDE4FF",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
  },
  btnGhostText: { color: "#3578d0", fontFamily: "kanitB", fontSize: 15 },
});
